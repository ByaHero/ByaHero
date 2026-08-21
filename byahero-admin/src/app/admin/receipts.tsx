import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';
import AlertModal from '@/components/AlertModal';
import { Ionicons } from '@expo/vector-icons';
import PrinterModal from '@/components/PrinterModal';
import { usePrinter } from '@/hooks/usePrinter';

export default function AdminReceiptConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [companyName, setCompanyName] = useState('ByaHero Transit');
  const [clientName, setClientName] = useState('');
  
  // Web Bluetooth state
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);

  // Native Printer state
  const printer = usePrinter();
  const [isPrinterModalVisible, setIsPrinterModalVisible] = useState(false);
  const isNativePrinterConnected = !!printer.connectedPrinter;
  
  const isPrinterReady = Platform.OS === 'web' ? isPrinterConnected : isNativePrinterConnected;

  const [sampleFare, setSampleFare] = useState<{origin: string, destination: string, regular_fare: number} | null>(null);
  const [tinNumber, setTinNumber] = useState('000-000-000-000');
  const [headerMessage, setHeaderMessage] = useState('Welcome aboard!');
  const [footerMessage, setFooterMessage] = useState('Thank you for riding with us!');

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
    });
  };

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReceiptConfig();
      if (res.success && res.config) {
        setCompanyName(res.config.company_name || '');
        setClientName(res.config.client_name || '');
        setTinNumber(res.config.tin_number || '');
        setHeaderMessage(res.config.header_message || '');
        setFooterMessage(res.config.footer_message || '');
      }
      
      // Fetch fare guide for sample
      try {
        const fareRes = await adminService.listFares();
        if (fareRes.success && fareRes.fares && fareRes.fares.length > 0) {
          const fare = fareRes.fares[0];
          setSampleFare({
            origin: fare.origin_name || 'TANAUAN',
            destination: fare.stop_name || fare.destination_name || 'LAUREL',
            regular_fare: fare.regular_fare || 25
          });
        }
      } catch (e) {
        console.error('Failed to load fares for preview', e);
      }
    } catch (e) {
      console.error('Failed to fetch receipt config', e);
      showAlert('Error', 'Could not load receipt configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        company_name: companyName,
        client_name: clientName,
        tin_number: tinNumber,
        header_message: headerMessage,
        footer_message: footerMessage,
      };
      
      const res = await adminService.saveReceiptConfig(data);
      if (res.success) {
        showAlert('Success', 'Receipt configuration saved.', 'success');
      } else {
        showAlert('Error', res.error || 'Failed to save configuration.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'An error occurred while saving.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const connectWebBluetooth = async () => {
    try {
      if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
        showAlert('Not Supported', 'Web Bluetooth is not supported on this browser. Please use Chrome or Edge.', 'error');
        return;
      }
      
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2'  // PT-210 specific
        ]
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsPrinterConnected(false);
        setBleDevice(null);
        setBleCharacteristic(null);
        showAlert('Disconnected', 'Printer disconnected.', 'info');
      });

      const server = await device.gatt.connect();
      let characteristic = null;
      
      const services = await server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            characteristic = char;
            break;
          }
        }
        if (characteristic) break;
      }

      if (characteristic) {
        setBleDevice(device);
        setBleCharacteristic(characteristic);
        setIsPrinterConnected(true);
        showAlert('Success', `Connected to ${device.name || 'Printer'}`, 'success');
      } else {
        showAlert('Error', 'No writable characteristic found on this device.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      if (e.message && !e.message.toLowerCase().includes('cancelled')) {
        showAlert('Connection Failed', e.message || 'Could not connect.', 'error');
      }
    }
  };

  const handleTestPrint = async () => {
    if (!isPrinterReady) {
      showAlert('Bluetooth Printer', 'Please connect a Bluetooth printer (e.g. PT-210) first.', 'warning');
      return;
    }
    
    try {
      if (Platform.OS !== 'web') {
        const ticketMock = {
          busNumber: 'BUS-001',
          ticketNumber: 'TEST',
          date: '08/20/2026',
          discount: 'REGULAR',
          boarding: sampleFare ? sampleFare.origin : 'TANAUAN',
          alighting: sampleFare ? sampleFare.destination : 'LAUREL',
          fare: sampleFare ? sampleFare.regular_fare : 25.00
        };
        const configMock = { company_name: companyName, client_name: clientName, tin_number: tinNumber, header_message: headerMessage, footer_message: footerMessage };
        await printer.printReceipt(ticketMock, configMock);
        showAlert('Test Print', 'Test receipt sent to native printer.', 'success');
        return;
      }

      // Web handling below
      if (!bleCharacteristic) return;
      const encoder = new TextEncoder();
      
      let text = "";
      const C = "\x1B\x61\x01"; // Center align
      const L = "\x1B\x61\x00"; // Left align
      const BOLD_ON = "\x1B\x45\x01"; 
      const BOLD_OFF = "\x1B\x45\x00";
      
      text += `${C}${BOLD_ON}${companyName || 'COMPANY NAME'}${BOLD_OFF}\n`;
      if (clientName) text += `${C}${clientName}\n`;
      if (tinNumber) text += `${C}TIN: ${tinNumber}\n`;
      text += "--------------------------------\n";
      
      if (headerMessage) {
        text += `${C}${headerMessage}\n`;
        text += "--------------------------------\n";
      }

      const pad = (label: string, value: string) => {
        const spaces = 32 - label.length - String(value).length;
        return spaces > 0 ? label + " ".repeat(spaces) + value + "\n" : label + " " + value + "\n";
      };

      text += `${L}`;
      text += pad("DATE:", "08/20/2026");
      text += pad("TIME:", "1:00 PM");
      text += pad("BUS:", "BUS-001");
      text += pad("PAX:", "1");
      text += "--------------------------------\n";
      text += pad("TYPE:", "REGULAR");
      text += pad("BOARDED:", sampleFare ? sampleFare.origin : 'TANAUAN');
      text += pad("ALIGHT:", sampleFare ? sampleFare.destination : 'LAUREL');
      text += "--------------------------------\n";
      text += pad("TOTAL:", `PHP ${sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '25.00'}`);
      
      if (footerMessage) {
        text += `\n${C}${footerMessage}\n`;
      }
      text += "\n";

      const initCmd = new Uint8Array([0x1B, 0x40]);
      const textData = encoder.encode(text);
      const payload = new Uint8Array(initCmd.length + textData.length);
      payload.set(initCmd);
      payload.set(textData, initCmd.length);
      
      const CHUNK_SIZE = 512;
      for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const chunk = payload.slice(i, i + CHUNK_SIZE);
        if (bleCharacteristic.properties.writeWithoutResponse) {
           await bleCharacteristic.writeValueWithoutResponse(chunk);
        } else {
           await bleCharacteristic.writeValue(chunk);
        }
      }
      
      showAlert('Test Print', 'Test receipt sent to printer.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Print Error', e.message || 'Failed to print.', 'error');
    }
  };

  const ReceiptPreview = () => (
    <View style={tw`bg-gray-100 p-4 rounded-xl items-center`}>
      <View style={tw`w-[300px] bg-white border border-gray-300 p-4 rounded-lg shadow-sm`}>
        <Text style={tw`text-center font-bold text-lg mb-1`}>{companyName || 'COMPANY NAME'}</Text>
        {!!clientName && (
          <Text style={tw`text-center font-semibold text-sm mb-1`}>{clientName}</Text>
        )}
        <Text style={tw`text-center text-xs text-gray-600 mb-4`}>TIN: {tinNumber || '000-000-000-000'}</Text>
        
        <Text style={tw`text-center text-sm mb-4 border-b border-dashed border-gray-300 pb-2`}>
          {headerMessage || 'Header text here'}
        </Text>
        
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-xs`}>DATE: 08/20/2026</Text>
          <Text style={tw`text-xs`}>TIME: 1:00 PM</Text>
        </View>
        <View style={tw`flex-row justify-between mb-1`}>
          <Text style={tw`text-xs`}>BUS: BUS-001</Text>
          <Text style={tw`text-xs`}>PAX: 1</Text>
        </View>

        <View style={tw`mt-2 mb-2 w-full border-t border-dashed border-gray-300 pt-2`}>
          <View style={tw`flex-row justify-between mb-1`}>
            <Text style={tw`text-xs`}>TYPE:</Text>
            <Text style={tw`text-xs text-right`}>REGULAR</Text>
          </View>
          <View style={tw`flex-row justify-between mb-1`}>
            <Text style={tw`text-xs`}>BOARDED:</Text>
            <Text style={tw`text-xs text-right max-w-[70%]`} numberOfLines={1}>{sampleFare ? sampleFare.origin : 'TANAUAN'}</Text>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-xs`}>ALIGHT:</Text>
            <Text style={tw`text-xs text-right max-w-[70%]`} numberOfLines={1}>{sampleFare ? sampleFare.destination : 'LAUREL'}</Text>
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-4 border-b border-dashed border-gray-300 pb-2`}>
          <Text style={tw`text-xs font-bold`}>TOTAL:</Text>
          <Text style={tw`text-xs font-bold`}>PHP {sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '25.00'}</Text>
        </View>
        
        <Text style={tw`text-center text-xs italic text-gray-500 mt-2`}>
          {footerMessage || 'Footer text here'}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="RECEIPT CONFIG" />
      
      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#4C85C5" />
        </View>
      ) : (
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw`flex-1`}
        >
          <ScrollView contentContainerStyle={tw`p-4 pb-20`}>
            
            <View style={tw`mb-6`}>
              <Text style={tw`text-2xl font-black text-slate-900 tracking-tight`}>Receipt Format</Text>
              <Text style={tw`text-slate-500 text-sm mt-1`}>
                Configure the text printed on physical tickets by the conductor's PT-210 portable printer.
              </Text>
            </View>

            <View style={tw`flex-row flex-wrap justify-between`}>
              
              {/* Form Section */}
              <View style={tw`w-full lg:w-[48%] mb-6 lg:mb-0`}>
                <View style={tw`bg-white p-5 rounded-2xl shadow-sm border border-gray-200`}>
                  
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>COMPANY NAME</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50`}
                      value={companyName}
                      onChangeText={setCompanyName}
                      placeholder="e.g. ByaHero Transit"
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>CLIENT COMPANY NAME</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50`}
                      value={clientName}
                      onChangeText={setClientName}
                      placeholder="e.g. ABC Corporation"
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>TIN NUMBER / TAX ID</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50`}
                      value={tinNumber}
                      onChangeText={setTinNumber}
                      placeholder="e.g. 123-456-789-000"
                    />
                  </View>

                  <View style={tw`mb-4`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>HEADER MESSAGE</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-left`}
                      value={headerMessage}
                      onChangeText={setHeaderMessage}
                      placeholder="Text below the title"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <View style={tw`mb-6`}>
                    <Text style={tw`text-xs font-bold text-gray-500 mb-1`}>FOOTER MESSAGE</Text>
                    <TextInput
                      style={tw`border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-left`}
                      value={footerMessage}
                      onChangeText={setFooterMessage}
                      placeholder="Terms or thank you message"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={saving}
                    style={tw`bg-[#1d72f8] rounded-full py-4 items-center shadow-md flex-row justify-center`}
                  >
                    {saving ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons name="save-outline" size={20} color="white" style={tw`mr-2`} />
                        <Text style={tw`text-white font-bold text-[15px]`}>SAVE CONFIGURATION</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  
                </View>
              </View>

              {/* Preview Section */}
              <View style={tw`w-full lg:w-[48%]`}>
                <View style={tw`bg-white p-5 rounded-2xl shadow-sm border border-gray-200`}>
                  <View style={tw`flex-row items-center justify-between mb-4`}>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="print-outline" size={20} color="#64748b" style={tw`mr-2`} />
                      <Text style={tw`text-sm font-bold text-slate-700`}>PT-210 RECEIPT PREVIEW</Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => {
                        if (Platform.OS === 'web') {
                          if (isPrinterConnected && bleDevice) {
                            bleDevice.gatt.disconnect();
                          } else {
                            connectWebBluetooth();
                          }
                        } else {
                          setIsPrinterModalVisible(true);
                        }
                      }}
                      style={tw`flex-row items-center bg-gray-50 px-2 py-1 rounded-full border border-gray-200`}
                    >
                      <Ionicons name="bluetooth" size={12} color={isPrinterReady ? '#3b82f6' : '#94a3b8'} style={tw`mr-1`} />
                      <Text style={tw`text-[10px] font-bold ${isPrinterReady ? 'text-blue-500' : 'text-slate-500'}`}>
                        {isPrinterReady ? 'CONNECTED' : (Platform.OS === 'web' && isPrinterConnected) ? 'DISCONNECT' : 'CONNECT'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  <ReceiptPreview />
                  
                  <TouchableOpacity
                    onPress={handleTestPrint}
                    style={tw`${isPrinterReady ? 'bg-slate-800' : 'bg-slate-300'} rounded-full py-3 mt-6 items-center shadow-md flex-row justify-center`}
                  >
                    <Ionicons name="print" size={18} color="white" style={tw`mr-2`} />
                    <Text style={tw`text-white font-bold text-[14px]`}>TEST PRINT</Text>
                  </TouchableOpacity>
                  
                  <Text style={tw`text-xs text-gray-400 mt-4 text-center px-4`}>
                    Note: Connection works natively on Chrome/Edge via Web Bluetooth. Print layout depends on 58mm printer width.
                  </Text>
                </View>
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
      {Platform.OS !== 'web' && (
        <PrinterModal
          visible={isPrinterModalVisible}
          onClose={() => setIsPrinterModalVisible(false)}
          devices={printer.devices}
          pairedDevices={printer.pairedDevices}
          isScanning={printer.isScanning}
          onScan={printer.scanDevices}
          onConnect={printer.connectPrinter}
          connectedPrinter={printer.connectedPrinter}
        />
      )}
    </SafeAreaView>
  );
}
