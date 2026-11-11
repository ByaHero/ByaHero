import { useState, useEffect, useRef } from 'react';
import { Alert, NativeModules, PermissionsAndroid, Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { PrinterStatusModule } = NativeModules;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BLEPrinter: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let COMMANDS: any = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EPToolkit: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const printerLib = require('react-native-thermal-receipt-printer-image-qr');
  BLEPrinter = printerLib.BLEPrinter;
  COMMANDS = printerLib.COMMANDS;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  EPToolkit = require('react-native-thermal-receipt-printer-image-qr/dist/utils/EPToolkit');
} catch (e) {
  // Library not available, printer features will be disabled
}

export type PaperWarningStatus = 'low' | 'critical_low' | 'out_of_paper' | 'out_or_jammed' | null;
export type PrintFailureCode =
  | 'OUT_OF_PAPER'
  | 'OUT_OF_PAPER_MID_PRINT'
  | 'COVER_OPEN'
  | 'DISCONNECTED'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface IPrinterDevice {
  name: string;
  macAddress: string;
}

export const CONNECTED_PRINTER_STORAGE_KEY = 'byahero_connected_printer';
export const PAPER_ROLL_COUNT_STORAGE_KEY = 'byahero_printer_roll_count';
export const DEFAULT_ROLL_CAPACITY = 65; // Average tickets per standard 58mm thermal roll
export const LOW_PAPER_THRESHOLD = 50;  // Threshold for low paper warning (approx 75-80%)

export function usePrinter(enabled: boolean = true) {
  const [devices, setDevices] = useState<IPrinterDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<IPrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<IPrinterDevice | null>(null);

  // Live Connection & Offline Health State
  const [isPrinterOffline, setIsPrinterOffline] = useState(false);
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  // Paper Roll Status State
  const [paperCount, setPaperCount] = useState(0);
  const paperCountRef = useRef(0);
  const isPrintingJobRef = useRef(false);
  const [paperWarning, setPaperWarning] = useState<PaperWarningStatus>(null);

  useEffect(() => {
    paperCountRef.current = paperCount;
  }, [paperCount]);

  const createPrinterError = (code: PrintFailureCode, message: string) => {
    const err = new Error(message) as Error & { code?: PrintFailureCode };
    err.code = code;
    return err;
  };

  const applyEstimatedPaperWarning = (count: number) => {
    if (count >= DEFAULT_ROLL_CAPACITY) {
      setPaperWarning('critical_low');
    } else if (count >= LOW_PAPER_THRESHOLD) {
      setPaperWarning('low');
    } else {
      setPaperWarning(null);
    }
  };

  const checkPaperStatus = async (silent = true, forceQuery = false): Promise<string> => {
    if (Platform.OS !== 'android' || !PrinterStatusModule?.getPrinterStatus || (!forceQuery && !connectedPrinter)) {
      return 'UNKNOWN';
    }
    try {
      const status: string = await PrinterStatusModule.getPrinterStatus();
      setIsPrinterOffline(false);
      if (status === 'OUT_OF_PAPER') {
        setPaperWarning('out_of_paper');
      } else if (status === 'COVER_OPEN' || status === 'PRINTER_ERROR') {
        setPaperWarning('out_or_jammed');
      } else if (status === 'PAPER_NEAR_END') {
        setPaperWarning('critical_low');
      } else if (status === 'OK') {
        applyEstimatedPaperWarning(paperCountRef.current);
      }
      return status;
    } catch (e: any) {
      setIsPrinterOffline(true);
      if (!silent) {
        setOfflineDismissed(false);
      }
      return 'DISCONNECTED';
    }
  };

  useEffect(() => {
    if (!enabled) return;

    if (BLEPrinter && BLEPrinter.init) {
      BLEPrinter.init().catch(console.warn);
    }

    // Restore saved connected printer across screens
    AsyncStorage.getItem(CONNECTED_PRINTER_STORAGE_KEY).then(raw => {
      if (raw) {
        try {
          const device = JSON.parse(raw);
          if (device && device.macAddress) {
            setConnectedPrinter(device);
            if (Platform.OS === 'android' && BLEPrinter && BLEPrinter.connectPrinter) {
              BLEPrinter.connectPrinter(device.macAddress).catch((e: any) => {
                console.warn('Silent auto-reconnect printer note:', e?.message || e);
                setIsPrinterOffline(true);
              });
            }
          }
        } catch (_) {}
      }
    }).catch(console.warn);

    // Restore tracked paper roll count
    AsyncStorage.getItem(PAPER_ROLL_COUNT_STORAGE_KEY).then(raw => {
      if (raw) {
        const count = parseInt(raw, 10);
        if (!isNaN(count)) {
          setPaperCount(count);
          if (count >= DEFAULT_ROLL_CAPACITY) {
            setPaperWarning('critical_low');
          } else if (count >= LOW_PAPER_THRESHOLD) {
            setPaperWarning('low');
          }
        }
      }
    }).catch(console.warn);

    // Watch for app coming back from background (ghost connection prevention & health probe)
    const sub = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        AsyncStorage.getItem(CONNECTED_PRINTER_STORAGE_KEY).then(raw => {
          if (raw) {
            try {
              const device = JSON.parse(raw);
              if (device && device.macAddress) {
                setConnectedPrinter(device);
                // Health probe when waking from background
                if (BLEPrinter && BLEPrinter.init) {
                  BLEPrinter.init().catch(() => {
                    setIsPrinterOffline(true);
                  });
                }
              }
            } catch (_) {}
          }
        }).catch(console.warn);
      }
    });

    return () => sub.remove();
  }, [enabled]);

  // Periodic health check every 15s when a printer is configured
  useEffect(() => {
    if (!enabled || !connectedPrinter) return;

    const interval = setInterval(() => {
      if (BLEPrinter && BLEPrinter.init) {
        BLEPrinter.init()
          .then(() => {
            if (!isPrintingJobRef.current) {
              checkPaperStatus(true);
            }
          })
          .catch(() => {
            setIsPrinterOffline(true);
            setOfflineDismissed(false);
          });
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [enabled, connectedPrinter]);

  const recordPrintedTickets = async (addedTickets = 1, hardwareStatus?: string) => {
    setPaperCount(prev => {
      const updated = prev + addedTickets;
      AsyncStorage.setItem(PAPER_ROLL_COUNT_STORAGE_KEY, String(updated)).catch(console.warn);
      if (hardwareStatus === 'PAPER_NEAR_END') {
        setPaperWarning('critical_low');
      } else {
        applyEstimatedPaperWarning(updated);
      }
      return updated;
    });
  };

  const resetPaperRoll = async (silent = false) => {
    try {
      await AsyncStorage.setItem(PAPER_ROLL_COUNT_STORAGE_KEY, '0');
      setPaperCount(0);
      setPaperWarning(null);
      if (connectedPrinter) {
        await checkPaperStatus(true, true);
      }
      if (!silent) {
        Alert.alert('Paper Roll Reset', 'Thermal paper roll counter reset to 0. A fresh roll is now being tracked.');
      }
    } catch (e) {
      console.warn('Failed to reset paper roll count:', e);
    }
  };

  const dismissOfflineWarning = () => {
    setOfflineDismissed(true);
  };

  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const scanDevices = async () => {
    const hasPerm = await requestPermissions();
    if (!hasPerm) return;

    setIsScanning(true);
    try {
      if (!BLEPrinter || !BLEPrinter.init) {
        throw new Error('Bluetooth printer service is not available on this platform.');
      }
      await BLEPrinter.init();
      const scanned = await BLEPrinter.getDeviceList();
      
      const parseDevices = scanned.map((d: any) => ({
        name: d.device_name,
        macAddress: d.inner_mac_address
      }));

      setDevices(parseDevices);
      setPairedDevices([]);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Bluetooth Error', error.message || 'Failed to scan devices. Ensure Bluetooth is enabled.');
    } finally {
      setIsScanning(false);
    }
  };

  const connectPrinter = async (device: IPrinterDevice) => {
    try {
      setIsScanning(true);
      if (!device.macAddress) {
        throw new Error('Device missing address.');
      }
      if (!BLEPrinter || !BLEPrinter.connectPrinter) {
        throw new Error('Bluetooth printer service is not initialized.');
      }

      // Cleanly teardown any existing/ghost socket to avoid Android RFCOMM deadlocks
      if (BLEPrinter && BLEPrinter.closeConn) {
        try {
          await BLEPrinter.closeConn();
        } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 350));

      await BLEPrinter.connectPrinter(device.macAddress);
      setConnectedPrinter(device);
      setIsPrinterOffline(false);
      setOfflineDismissed(false);
      if (paperWarning === 'out_or_jammed' || paperWarning === 'out_of_paper') {
        applyEstimatedPaperWarning(paperCount);
      }
      await checkPaperStatus(true, true);
      await AsyncStorage.setItem(CONNECTED_PRINTER_STORAGE_KEY, JSON.stringify(device));
      Alert.alert('Success', `Connected to ${device.name || 'Printer'}`);
    } catch (e: any) {
      console.error(e);
      setIsPrinterOffline(true);
      Alert.alert('Connection Failed', e.message || 'Could not connect to printer.');
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Forcibly closes any stale/ghost Bluetooth socket, re-inits, and reconnects to printer
   */
  const reconnectPrinter = async (targetDevice?: IPrinterDevice | null) => {
    const device = targetDevice || connectedPrinter;
    if (!device || !device.macAddress) {
      Alert.alert('No Printer', 'No printer found to reconnect. Please scan and select a device.');
      return false;
    }

    setIsScanning(true);
    try {
      if (BLEPrinter && BLEPrinter.closeConn) {
        try {
          await BLEPrinter.closeConn();
        } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 450));

      if (BLEPrinter && BLEPrinter.init) {
        await BLEPrinter.init();
      }
      await BLEPrinter.connectPrinter(device.macAddress);
      setConnectedPrinter(device);
      setIsPrinterOffline(false);
      setOfflineDismissed(false);
      if (paperWarning === 'out_or_jammed' || paperWarning === 'out_of_paper') {
        applyEstimatedPaperWarning(paperCount);
      }
      await checkPaperStatus(true, true);
      await AsyncStorage.setItem(CONNECTED_PRINTER_STORAGE_KEY, JSON.stringify(device));
      Alert.alert('Reconnected', `Bluetooth link refreshed for ${device.name || 'Printer'}.`);
      return true;
    } catch (e: any) {
      console.warn('Reconnect error:', e);
      setIsPrinterOffline(true);
      Alert.alert('Reconnect Notice', e.message || 'Could not refresh connection. Please check that printer is turned on.');
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectPrinter = async () => {
    try {
      if (BLEPrinter && BLEPrinter.closeConn) {
        await BLEPrinter.closeConn();
      }
    } catch (_) {}
    setConnectedPrinter(null);
    setIsPrinterOffline(false);
    setOfflineDismissed(false);
    try {
      await AsyncStorage.removeItem(CONNECTED_PRINTER_STORAGE_KEY);
      Alert.alert('Disconnected', 'Printer disconnected.');
    } catch (_) {}
  };

  const normalizePrintError = (err: any, allowJammedFallback = false) => {
    const code = err?.code;
    if (code === 'OUT_OF_PAPER') {
      setIsPrinterOffline(false);
      setPaperWarning('out_of_paper');
      return createPrinterError('OUT_OF_PAPER', 'Printer is out of paper. Load a new 58mm thermal roll before printing.');
    }
    if (code === 'OUT_OF_PAPER_MID_PRINT') {
      setIsPrinterOffline(false);
      setPaperWarning('out_of_paper');
      return createPrinterError('OUT_OF_PAPER_MID_PRINT', 'Printer ran out of paper while printing. Load a new roll and reprint.');
    }
    if (code === 'COVER_OPEN') {
      setIsPrinterOffline(false);
      setPaperWarning('out_or_jammed');
      return createPrinterError('COVER_OPEN', 'Printer cover is open. Close the cover firmly and retry.');
    }
    setIsPrinterOffline(true);
    setOfflineDismissed(false);
    if (allowJammedFallback) {
      setPaperWarning('out_or_jammed');
    }
    const finalCode: PrintFailureCode = code === 'TIMEOUT' ? 'TIMEOUT' : 'DISCONNECTED';
    return createPrinterError(
      finalCode,
      err?.message || 'Printer did not respond. The Bluetooth link may have dropped.'
    );
  };

  /**
   * Safe printing wrapper that verifies ESC/POS paper status on Android and avoids socket hangs
   */
  const safePrintBill = async (text: string, timeoutMs = 9500): Promise<string> => {
    if (Platform.OS === 'android' && PrinterStatusModule?.printRawDataAndVerify && EPToolkit?.exchange_text) {
      let base64Payload = '';
      try {
        const buffer = EPToolkit.exchange_text(text.trimEnd(), {
          beep: true,
          cut: true,
          encoding: 'UTF8',
          tailingLine: false,
        });
        base64Payload = buffer.toString('base64');
      } catch (encodeErr: any) {
        throw createPrinterError('UNKNOWN', encodeErr?.message || 'Failed to encode receipt data.');
      }

      isPrintingJobRef.current = true;
      return await new Promise<string>((resolve, reject) => {
        let settled = false;
        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          isPrintingJobRef.current = false;
          reject(
            normalizePrintError(
              createPrinterError(
                'TIMEOUT',
                'Printer did not respond. The Bluetooth socket may have closed while in background. Tap "Reconnect" to revive the link.'
              )
            )
          );
        }, timeoutMs);

        PrinterStatusModule.printRawDataAndVerify(base64Payload)
          .then((status: string) => {
            if (settled) return;
            settled = true;
            isPrintingJobRef.current = false;
            clearTimeout(timer);
            setIsPrinterOffline(false);
            resolve(status || 'OK');
          })
          .catch((err: any) => {
            if (settled) return;
            settled = true;
            isPrintingJobRef.current = false;
            clearTimeout(timer);
            reject(normalizePrintError(err, false));
          });
      });
    }

    if (!BLEPrinter || !BLEPrinter.printBill) {
      throw createPrinterError('DISCONNECTED', 'Printer module unavailable');
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          normalizePrintError(
            createPrinterError(
              'TIMEOUT',
              'Printer did not respond. The Bluetooth socket may have closed while in background. Tap "Reconnect" to revive the link.'
            ),
            true
          )
        );
      }, timeoutMs);

      try {
        const res = BLEPrinter.printBill(text.trimEnd(), { tailingLine: false });
        if (res && typeof res.then === 'function') {
          res.then(() => {
            clearTimeout(timer);
            setIsPrinterOffline(false);
            resolve('UNKNOWN');
          }).catch((err: any) => {
            clearTimeout(timer);
            reject(normalizePrintError(err, true));
          });
        } else {
          clearTimeout(timer);
          setIsPrinterOffline(false);
          resolve('UNKNOWN');
        }
      } catch (err) {
        clearTimeout(timer);
        reject(normalizePrintError(err, true));
      }
    });
  };

  const printReceipt = async (ticket: any, config: any) => {
    if (!connectedPrinter) {
      throw new Error('No printer connected. Please connect a Bluetooth printer first.');
    }

    try {
      let text = "";
      text += `<CB>${config?.company_name || 'ByaHero Transit'}</CB>\n`;
      if (config?.client_name) text += `<C>${config.client_name}</C>\n`;
      text += `<C>TICKET NO: ${ticket.ticketNumber || 'N/A'}</C>\n`;
      
      if (config?.header_message) {
        text += `\n<C>${config.header_message}</C>\n`;
      } else {
        text += "\n";
      }
      text += "--------------------------------\n";
      
      const printRow = (left: string, right: string) => {
        const spaces = 32 - left.length - String(right).length;
        return spaces > 0 ? left + " ".repeat(spaces) + right + "\n" : left + " " + right + "\n";
      };

      // Sanitize non-ASCII characters that break printer column counting
      const dateStr = (ticket.date || "").replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
      let justDate = dateStr;
      let justTime = "";
      if (dateStr.includes(' ')) {
        const parts = dateStr.split(' ');
        justDate = parts[0].replace(',', '');
        justTime = parts.slice(1).join(' ').replace(/(\d{1,2}:\d{2}):\d{2}/, '$1');
      }

      text += printRow(`DATE: ${justDate}`, justTime ? `TIME: ${justTime}` : "");
      text += printRow(`BUS: ${ticket.busNumber || ""}`, `PAX: ${ticket.quantity || "1"}`);
      
      text += "--------------------------------\n";
      text += printRow("TYPE:", String(ticket.discount || ""));
      text += printRow("BOARDED:", String(ticket.boarding || ""));
      text += printRow("ALIGHT:", String(ticket.alighting || ""));
      text += printRow("TOTAL:", `PHP ${Number(ticket.fare).toFixed(2)}`);
      text += "--------------------------------\n";
      
      if (config?.footer_message) {
        text += `\n<C>${config.footer_message}</C>`;
      }

      const hwStatus = await safePrintBill(text);
      await recordPrintedTickets(Math.max(1, Number(ticket.quantity || 1)), hwStatus);
      setIsPrinterOffline(false);
      return true;
    } catch (e: any) {
      console.error('printReceipt error:', e);
      throw e;
    }
  };

  const printSummary = async (summary: any, summaryConfig: any, receiptConfig: any, isReprint = false, isInterim = false) => {
    if (!connectedPrinter) {
      throw new Error('No printer connected. Please connect a Bluetooth printer first.');
    }

    try {
      let text = "";
      text += `<CB>${receiptConfig?.company_name || 'ByaHero Transit'}</CB>\n`;
      if (receiptConfig?.client_name) text += `<C>${receiptConfig.client_name}</C>\n`;
      
      const title = summaryConfig?.summary_title || 'TRIP SUMMARY';
      text += `<C>${title}</C>\n`;
      
      if (isReprint) {
        text += "<CB>*** REPRINT ***</CB>\n";
      } else if (isInterim) {
        text += "<CB>*** INTERIM ***</CB>\n";
      }

      text += "--------------------------------\n";
      text += `DATE: ${summary.date || 'N/A'}\n`;
      text += `BUS: ${summary.bus_number || 'N/A'}\n`;
      if (summaryConfig?.show_conductor !== false) {
        text += `CONDUCTOR: ${summary.conductor_name || 'N/A'}\n`;
      }
      if (summaryConfig?.show_route !== false) {
        text += `ROUTE: ${summary.route || 'N/A'}\n`;
        text += `START: ${summary.start_time || 'N/A'}\n`;
        text += `END: ${summary.end_time || 'N/A'}\n`;
      }
      text += "--------------------------------\n";

      const printRow = (col1: string, col2: string, col3: string, col4: string) => {
        const c1 = (col1 + " ".repeat(10)).substring(0, 10);
        const c2 = (" ".repeat(4) + col2).slice(-4);
        const c3 = (" ".repeat(4) + col3).slice(-4);
        const c4 = (" ".repeat(11) + col4).slice(-11);
        return `${c1} ${c2} ${c3} ${c4}\n`;
      };
      
      const printRowTwoCols = (left: string, right: string) => {
        const spaces = 32 - left.length - String(right).length;
        return spaces > 0 ? left + " ".repeat(spaces) + right + "\n" : left + " " + right + "\n";
      };

      if (summaryConfig?.show_breakdown !== false) {
        text += printRow("TYPE", "TKTS", "PAX", "AMOUNT");
        if (summary.breakdown) {
          Object.keys(summary.breakdown).forEach(type => {
            const data = summary.breakdown[type];
            text += printRow(
              type.substring(0, 10), 
              String(data.tickets), 
              String(data.passengers), 
              Number(data.revenue).toFixed(2)
            );
          });
        }
        text += "--------------------------------\n";
      }

      text += printRowTwoCols("TOTAL TICKETS:", String(summary.total_tickets || 0));
      text += printRowTwoCols("TOTAL PASSENGERS:", String(summary.total_passengers || 0));
      text += printRowTwoCols("TOTAL REVENUE:", `PHP ${Number(summary.total_revenue || 0).toFixed(2)}`);
      text += "--------------------------------\n";

      if (summaryConfig?.show_trip_id !== false) {
        text += `TRIP ID: ${summary.trip_id || summary.id || 'N/A'}\n`;
        if (summary.shift_id) {
          text += `SHIFT ID: ${summary.shift_id}\n`;
        }
        text += "--------------------------------\n";
      }

      if (summaryConfig?.show_signatures !== false) {
        text += "\nConductor: ____________________\n";
        text += "\nReceived:  ____________________\n";
      }

      if (summaryConfig?.footer_message) {
        text += `\n<C>${summaryConfig.footer_message}</C>`;
      }

      const hwStatus = await safePrintBill(text);
      await recordPrintedTickets(2, hwStatus);
      setIsPrinterOffline(false);
      return true;
    } catch (e: any) {
      console.error('printSummary error:', e);
      throw e;
    }
  };

  const testPrint = async () => {
    if (!connectedPrinter) {
      Alert.alert('Printer Required', 'Please connect a Bluetooth printer before printing a test page.');
      return;
    }

    try {
      const now = new Date().toLocaleString();
      let text = "";
      text += "<CB>BYAHERO TRANSIT</CB>\n";
      text += "--------------------------------\n";
      text += "<C>** PRINTER TEST PAGE **</C>\n";
      text += "--------------------------------\n";
      text += `<C>${now}</C>\n`;
      text += "--------------------------------\n";
      text += "<C>Printer is working correctly.</C>\n";
      text += "<C>Ready to print receipts.</C>";

      const hwStatus = await safePrintBill(text);
      await recordPrintedTickets(1, hwStatus);
      setIsPrinterOffline(false);
      Alert.alert('Test Print', 'Test page sent to printer.');
    } catch (e: any) {
      console.error('testPrint error:', e);
      if (e?.code === 'OUT_OF_PAPER' || e?.code === 'OUT_OF_PAPER_MID_PRINT') {
        Alert.alert('Printer Out of Paper', e.message || 'Load a new 58mm thermal roll before printing.');
      } else if (e?.code === 'COVER_OPEN') {
        Alert.alert('Printer Cover Open', e.message || 'Close the paper cover and try again.');
      } else {
        Alert.alert('Print Error', e.message || 'Failed to send test print.');
      }
    }
  };

  return {
    devices,
    pairedDevices,
    isScanning,
    connectedPrinter,
    isPrinterOffline,
    offlineDismissed,
    paperCount,
    maxPaperCapacity: DEFAULT_ROLL_CAPACITY,
    paperWarning,
    checkPaperStatus,
    resetPaperRoll,
    dismissOfflineWarning,
    scanDevices,
    connectPrinter,
    reconnectPrinter,
    disconnectPrinter,
    printReceipt,
    printSummary,
    testPrint,
  };
}
