import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { IPrinterDevice, PaperWarningStatus } from '../hooks/usePrinter';

interface Props {
  visible: boolean;
  onClose: () => void;
  devices: IPrinterDevice[];
  pairedDevices: IPrinterDevice[];
  isScanning: boolean;
  onScan: () => void;
  onConnect: (device: IPrinterDevice) => void;
  connectedPrinter: IPrinterDevice | null;
  onTestPrint?: () => void;
  onDisconnect?: () => void;
  onReconnect?: () => void;
  isPrinterOffline?: boolean;
  paperCount?: number;
  maxPaperCapacity?: number;
  paperWarning?: PaperWarningStatus;
  onResetPaperRoll?: () => void;
}

export default function PrinterModal({
  visible,
  onClose,
  devices,
  pairedDevices,
  isScanning,
  onScan,
  onConnect,
  connectedPrinter,
  onTestPrint,
  onDisconnect,
  onReconnect,
  isPrinterOffline,
  paperCount = 0,
  maxPaperCapacity = 65,
  paperWarning,
  onResetPaperRoll,
}: Props) {
  
  const renderDevice = (device: IPrinterDevice, idx: number) => {
    const address = device.macAddress;
    const isConnected = connectedPrinter && (connectedPrinter.macAddress === address);
    
    return (
      <TouchableOpacity 
        key={idx}
        onPress={() => onConnect(device)}
        style={tw`flex-row items-center justify-between p-4 bg-white rounded-xl mb-2 border ${isConnected ? 'border-blue-500' : 'border-gray-200'}`}
      >
        <View style={tw`flex-row items-center`}>
          <Ionicons name="print" size={24} color={isConnected ? '#3b82f6' : '#64748b'} style={tw`mr-3`} />
          <View>
            <Text style={tw`font-bold text-slate-800`}>{device.name || 'Unknown Device'}</Text>
            <Text style={tw`text-xs text-slate-500`}>{address}</Text>
          </View>
        </View>
        {isConnected && (
          <Text style={tw`text-xs font-bold text-blue-500`}>CONNECTED</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={tw`flex-1 justify-end bg-black/50`}>
        <View style={tw`bg-slate-50 rounded-t-3xl h-[70%] p-6`}>
          
          <View style={tw`flex-row justify-between items-center mb-6`}>
            <Text style={tw`text-xl font-black text-slate-900`}>Connect Printer</Text>
            <TouchableOpacity onPress={onClose} style={tw`p-2 bg-gray-200 rounded-full`}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Offline Alert Banner */}
          {connectedPrinter && isPrinterOffline && (
            <View style={tw`bg-rose-50 border border-rose-300 rounded-xl px-4 py-3 mb-3 flex-row items-center justify-between`}>
              <View style={tw`flex-row items-center flex-1 mr-2`}>
                <Ionicons name="alert-circle" size={22} color="#e11d48" style={tw`mr-2`} />
                <View style={tw`flex-1`}>
                  <Text style={tw`text-rose-800 font-bold text-xs`}>PRINTER IS OFFLINE</Text>
                  <Text style={tw`text-rose-600 text-[11px]`}>Turn on printer or tap Reconnect to refresh link.</Text>
                </View>
              </View>
              {onReconnect && (
                <TouchableOpacity
                  onPress={onReconnect}
                  style={tw`bg-rose-600 px-3 py-1.5 rounded-lg`}
                >
                  <Text style={tw`text-white font-bold text-xs`}>Reconnect</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Connected Printer Status Banner */}
          {connectedPrinter && (
            <View style={tw`flex-row items-center justify-between ${
              isPrinterOffline ? 'bg-slate-100 border-slate-300' : 'bg-blue-50 border-blue-200'
            } border rounded-xl px-4 py-3 mb-3`}>
              <View style={tw`flex-row items-center flex-1`}>
                <Ionicons
                  name={isPrinterOffline ? 'alert-circle' : 'checkmark-circle'}
                  size={20}
                  color={isPrinterOffline ? '#e11d48' : '#3b82f6'}
                  style={tw`mr-2`}
                />
                <View style={tw`flex-1`}>
                  <Text style={tw`${isPrinterOffline ? 'text-rose-700' : 'text-blue-700'} font-bold text-xs`}>
                    {isPrinterOffline ? 'DEVICE LINK PAUSED' : 'CONNECTED'}
                  </Text>
                  <Text style={tw`${isPrinterOffline ? 'text-rose-600' : 'text-blue-600'} text-xs`} numberOfLines={1}>
                    {connectedPrinter.name || connectedPrinter.macAddress}
                  </Text>
                </View>
              </View>
              <View style={tw`flex-row items-center gap-2 ml-3`}>
                {onReconnect && (
                  <TouchableOpacity
                    onPress={onReconnect}
                    style={tw`bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1.5`}
                  >
                    <Text style={tw`text-amber-800 font-bold text-xs`}>Reconnect</Text>
                  </TouchableOpacity>
                )}
                {onTestPrint && (
                  <TouchableOpacity
                    onPress={onTestPrint}
                    style={tw`bg-blue-600 rounded-lg px-2.5 py-1.5`}
                  >
                    <Text style={tw`text-white font-bold text-xs`}>Test</Text>
                  </TouchableOpacity>
                )}
                {onDisconnect && (
                  <TouchableOpacity
                    onPress={onDisconnect}
                    style={tw`bg-rose-50 border border-rose-200 rounded-lg px-2.5 py-1.5`}
                  >
                    <Text style={tw`text-rose-600 font-bold text-xs`}>Disconnect</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Thermal Paper Roll Health Card */}
          {connectedPrinter && (
            <View style={tw`bg-white border border-slate-200 rounded-xl p-3.5 mb-4 shadow-xs`}>
              <View style={tw`flex-row items-center justify-between mb-2`}>
                <View style={tw`flex-row items-center`}>
                  <Ionicons name="newspaper-outline" size={16} color="#475569" style={tw`mr-1.5`} />
                  <Text style={tw`text-xs font-bold text-slate-800`}>Thermal Paper Roll (58mm)</Text>
                </View>
                <View style={tw`px-2 py-0.5 rounded-full ${
                  paperWarning === 'out_of_paper' || paperWarning === 'out_or_jammed'
                    ? 'bg-rose-100'
                    : paperWarning === 'critical_low' || paperWarning === 'low'
                    ? 'bg-amber-100'
                    : 'bg-emerald-100'
                }`}>
                  <Text style={tw`text-[10px] font-black ${
                    paperWarning === 'out_of_paper' || paperWarning === 'out_or_jammed'
                      ? 'text-rose-700'
                      : paperWarning === 'critical_low' || paperWarning === 'low'
                      ? 'text-amber-800'
                      : 'text-emerald-700'
                  }`}>
                    {paperWarning === 'out_of_paper'
                      ? 'OUT OF PAPER'
                      : paperWarning === 'out_or_jammed'
                      ? 'CHECK PAPER / COVER'
                      : paperWarning === 'critical_low'
                      ? 'ROLL CRITICAL'
                      : paperWarning === 'low'
                      ? 'ROLL LOW'
                      : 'PAPER OK'}
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={tw`w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2`}>
                <View
                  style={[
                    tw`h-full rounded-full`,
                    {
                      width: `${Math.min(100, Math.round(((paperCount || 0) / (maxPaperCapacity || 65)) * 100))}%`,
                      backgroundColor:
                        (paperCount || 0) >= (maxPaperCapacity || 65)
                          ? '#e11d48'
                          : (paperCount || 0) >= 50
                          ? '#f59e0b'
                          : '#10b981',
                    },
                  ]}
                />
              </View>

              <View style={tw`flex-row items-center justify-between`}>
                <Text style={tw`text-[11px] text-slate-500`}>
                  <Text style={tw`font-bold text-slate-800`}>{paperCount || 0}</Text> / {maxPaperCapacity || 65} tickets printed
                  {maxPaperCapacity && ` (~${Math.max(0, maxPaperCapacity - (paperCount || 0))} left)`}
                </Text>
                {onResetPaperRoll && (
                  <TouchableOpacity
                    onPress={onResetPaperRoll}
                    style={tw`px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-300`}
                  >
                    <Text style={tw`text-[10px] font-bold text-slate-700`}>New Roll Loaded</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <TouchableOpacity
            onPress={onScan}
            disabled={isScanning}
            style={tw`bg-slate-800 rounded-xl py-3 flex-row justify-center items-center mb-6`}
          >
            {isScanning ? (
              <ActivityIndicator color="#fff" style={tw`mr-2`} />
            ) : (
              <Ionicons name="bluetooth" size={18} color="white" style={tw`mr-2`} />
            )}
            <Text style={tw`text-white font-bold`}>{isScanning ? 'Scanning...' : 'Scan for Printers'}</Text>
          </TouchableOpacity>

          <ScrollView style={tw`flex-1`}>
            {pairedDevices.length > 0 && (
              <>
                <Text style={tw`text-xs font-bold text-slate-500 mb-3 ml-2`}>PAIRED DEVICES</Text>
                {pairedDevices.map((d, i) => renderDevice(d, i))}
              </>
            )}

            {devices.length > 0 && (
              <>
                <Text style={tw`text-xs font-bold text-slate-500 mb-3 ml-2 mt-4`}>AVAILABLE DEVICES</Text>
                {devices.map((d, i) => renderDevice(d, i))}
              </>
            )}
            
            {!isScanning && pairedDevices.length === 0 && devices.length === 0 && (
              <View style={tw`items-center justify-center py-10`}>
                <Ionicons name="print-outline" size={48} color="#cbd5e1" mb={2} />
                <Text style={tw`text-slate-400 text-center`}>No Bluetooth printers found.{'\n'}Tap Scan to search.</Text>
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}
