import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import tw from 'twrnc';
import { Ionicons } from '@expo/vector-icons';
import { IPrinterDevice } from '../hooks/usePrinter';

interface Props {
  visible: boolean;
  onClose: () => void;
  devices: IPrinterDevice[];
  pairedDevices: IPrinterDevice[];
  isScanning: boolean;
  onScan: () => void;
  onConnect: (device: IPrinterDevice) => void;
  connectedPrinter: IPrinterDevice | null;
}

export default function PrinterModal({
  visible, onClose, devices, pairedDevices, isScanning, onScan, onConnect, connectedPrinter
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
