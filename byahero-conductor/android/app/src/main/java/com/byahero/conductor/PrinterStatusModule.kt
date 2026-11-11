package com.byahero.conductor

import android.bluetooth.BluetoothSocket
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.pinmi.react.printer.adapter.BLEPrinterAdapter
import java.io.IOException
import java.util.concurrent.Executors

class PrinterStatusModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val tag = "PrinterStatusModule"
    private val ioExecutor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "PrinterStatusModule"

    private fun getActiveSocket(): BluetoothSocket? {
        return try {
            val adapter = BLEPrinterAdapter.getInstance() ?: return null
            val field = BLEPrinterAdapter::class.java.getDeclaredField("mBluetoothSocket")
            field.isAccessible = true
            field.get(adapter) as? BluetoothSocket
        } catch (e: Exception) {
            Log.w(tag, "Failed to reflect mBluetoothSocket: ${e.message}")
            null
        }
    }

    @Throws(IOException::class)
    private fun readEscPosStatusByte(socket: BluetoothSocket, subCommand: Byte, timeoutMs: Long): Int? {
        val input = socket.inputStream
        val output = socket.outputStream

        var drained = 0
        while (input.available() > 0 && drained < 64) {
            input.read()
            drained++
        }

        output.write(byteArrayOf(0x10, 0x04, subCommand))
        output.flush()

        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            while (input.available() > 0) {
                val b = input.read()
                if (b != -1 && (b and 0x93) == 0x12) {
                    Log.i(tag, "DLE EOT ${subCommand.toInt()} -> 0x${b.toString(16)}")
                    return b
                } else if (b != -1) {
                    Log.i(tag, "DLE EOT ${subCommand.toInt()} unexpected byte -> 0x${b.toString(16)}")
                }
            }
            try {
                Thread.sleep(20)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
                break
            }
        }
        return null
    }

    private fun queryEscPosStatus(socket: BluetoothSocket): Pair<String, String?> {
        if (!socket.isConnected) {
            return "DISCONNECTED" to "Printer socket is not connected."
        }
        return try {
            // DLE EOT 4: Roll paper sensor status (bits 5,6 = 0x60 indicate paper end)
            val rollStatus = readEscPosStatusByte(socket, 0x04, 350)
            if (rollStatus != null && (rollStatus and 0x60) != 0) {
                return "OUT_OF_PAPER" to null
            }

            // DLE EOT 2: Offline cause status (bit 2 = cover open, bit 5 = paper-end stop, bit 6 = error)
            val offlineStatus = readEscPosStatusByte(socket, 0x02, 250)
            if (offlineStatus != null) {
                if ((offlineStatus and 0x20) != 0) {
                    return "OUT_OF_PAPER" to null
                }
                if ((offlineStatus and 0x04) != 0) {
                    return "COVER_OPEN" to null
                }
                if ((offlineStatus and 0x40) != 0) {
                    return "PRINTER_ERROR" to null
                }
            }

            if (rollStatus != null && (rollStatus and 0x0C) == 0x0C) {
                return "PAPER_NEAR_END" to null
            }
            if (rollStatus != null || offlineStatus != null) {
                return "OK" to null
            }
            "UNKNOWN" to null
        } catch (e: IOException) {
            "DISCONNECTED" to (e.message ?: "Bluetooth socket I/O error.")
        }
    }

    @ReactMethod
    fun getPrinterStatus(promise: Promise) {
        ioExecutor.execute {
            val socket = getActiveSocket()
            if (socket == null || !socket.isConnected) {
                promise.reject("DISCONNECTED", "No active printer Bluetooth connection.")
                return@execute
            }

            val (status, errorDetail) = queryEscPosStatus(socket)
            if (status == "DISCONNECTED") {
                promise.reject("DISCONNECTED", errorDetail ?: "Printer disconnected.")
            } else {
                promise.resolve(status)
            }
        }
    }

    @ReactMethod
    fun printRawDataAndVerify(base64Data: String, promise: Promise) {
        ioExecutor.execute {
            val socket = getActiveSocket()
            if (socket == null || !socket.isConnected) {
                promise.reject("DISCONNECTED", "No active printer Bluetooth connection.")
                return@execute
            }

            val (preStatus, preErr) = queryEscPosStatus(socket)
            when (preStatus) {
                "OUT_OF_PAPER" -> {
                    promise.reject("OUT_OF_PAPER", "Printer is out of paper.")
                    return@execute
                }
                "COVER_OPEN" -> {
                    promise.reject("COVER_OPEN", "Printer cover is open.")
                    return@execute
                }
                "DISCONNECTED" -> {
                    promise.reject("DISCONNECTED", preErr ?: "Printer disconnected.")
                    return@execute
                }
            }

            val bytes = try {
                Base64.decode(base64Data, Base64.DEFAULT)
            } catch (e: Exception) {
                promise.reject("ENCODE_ERROR", e.message ?: "Invalid base64 print payload.")
                return@execute
            }

            try {
                val output = socket.outputStream
                output.write(bytes, 0, bytes.size)
                output.flush()
            } catch (e: IOException) {
                Log.e(tag, "Failed writing receipt bytes", e)
                promise.reject("DISCONNECTED", e.message ?: "Failed to write to Bluetooth printer.")
                return@execute
            }

            if (preStatus == "UNKNOWN") {
                Log.i(tag, "Pre-print status UNKNOWN (firmware did not reply to DLE EOT); skipping post-print verify.")
                promise.resolve("UNKNOWN")
                return@execute
            }

            // Poll ESC/POS paper & cover status across the physical feed duration of the job
            val lineCount = bytes.count { it == 0x0A.toByte() }.coerceAtLeast(1)
            val verifyDurationMs = (lineCount * 170L).coerceIn(3000L, 5500L)
            val endCheckDeadline = System.currentTimeMillis() + verifyDurationMs
            var lastPostStatus = preStatus

            try {
                Thread.sleep(300)
            } catch (_: InterruptedException) {
                Thread.currentThread().interrupt()
            }

            while (true) {
                val (postStatus, postErr) = queryEscPosStatus(socket)
                when (postStatus) {
                    "OUT_OF_PAPER" -> {
                        Log.i(tag, "Mid-print OUT_OF_PAPER detected")
                        promise.reject("OUT_OF_PAPER_MID_PRINT", "Printer ran out of paper while printing.")
                        return@execute
                    }
                    "COVER_OPEN" -> {
                        Log.i(tag, "Mid-print COVER_OPEN detected")
                        promise.reject("COVER_OPEN", "Printer cover is open.")
                        return@execute
                    }
                    "DISCONNECTED" -> {
                        promise.reject("DISCONNECTED", postErr ?: "Printer connection lost during print.")
                        return@execute
                    }
                }
                lastPostStatus = postStatus
                if (System.currentTimeMillis() >= endCheckDeadline) {
                    break
                }
                try {
                    Thread.sleep(250)
                } catch (_: InterruptedException) {
                    Thread.currentThread().interrupt()
                    break
                }
            }

            Log.i(tag, "Post-print verification completed cleanly: $lastPostStatus (${lineCount} lines, ${verifyDurationMs}ms window)")
            promise.resolve(lastPostStatus)
        }
    }

    override fun invalidate() {
        ioExecutor.shutdownNow()
        super.invalidate()
    }
}

