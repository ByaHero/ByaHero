import { useState, useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

let BLEPrinter: any = null;
if (Platform.OS !== 'web') {
  try {
    BLEPrinter = require('react-native-thermal-receipt-printer-image-qr').BLEPrinter;
  } catch(e) {}
}

export interface IPrinterDevice {
  name: string;
  macAddress: string;
}

export function usePrinter() {
  const [devices, setDevices] = useState<IPrinterDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<IPrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<IPrinterDevice | null>(null);

  useEffect(() => {
    BLEPrinter.init().catch(console.warn);
  }, []);

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
      await BLEPrinter.init();
      const scanned = await BLEPrinter.getDeviceList();
      
      const parseDevices = scanned.map((d: any) => ({
        name: d.device_name,
        macAddress: d.inner_mac_address
      }));

      setDevices(parseDevices);
      setPairedDevices([]); // This library returns all devices together
    } catch (error) {
      console.error(error);
      Alert.alert('Bluetooth Error', 'Failed to scan devices. Ensure Bluetooth is enabled.');
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
      await BLEPrinter.connectPrinter(device.macAddress);
      setConnectedPrinter(device);
      Alert.alert('Success', `Connected to ${device.name || 'Printer'}`);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Connection Failed', e.message || 'Could not connect to printer.');
    } finally {
      setIsScanning(false);
    }
  };

  const printReceipt = async (ticket: any, config: any) => {
    try {
      const C = "<C>"; const _C = "</C>";
      
      let text = "";
      text += `${C}${config?.company_name || 'ByaHero Transit'}${_C}\n`;
      if (config?.client_name) text += `${C}${config.client_name}${_C}\n`;
      if (config?.tin_number) text += `${C}TIN: ${config.tin_number}${_C}\n`;
      text += "--------------------------------\n";
      
      if (config?.header_message) {
        text += `${C}${config.header_message}${_C}\n`;
        text += "--------------------------------\n";
      }

      text += `TICKET: ${ticket.busNumber} ${ticket.ticketNumber}\n`;
      text += `DATE: ${ticket.date}\n`;
      text += `TYPE: ${ticket.discount}\n`;
      text += `BOARDED: ${ticket.boarding}\n`;
      text += `ALIGHT: ${ticket.alighting}\n`;
      
      text += "--------------------------------\n";
      text += `TOTAL: PHP ${Number(ticket.fare).toFixed(2)}\n`;
      
      if (config?.footer_message) {
        text += `\n${C}${config.footer_message}${_C}\n`;
      }
      text += "\n\n\n";

      BLEPrinter.printText(text, { encoding: 'GBK' });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Print Error', e.message || 'Failed to print receipt.');
    }
  };

  return {
    devices,
    pairedDevices,
    isScanning,
    connectedPrinter,
    scanDevices,
    connectPrinter,
    printReceipt
  };
}
