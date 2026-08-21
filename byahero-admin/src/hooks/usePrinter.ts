import { useState, useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

let BLEPrinter: any = null;
let COMMANDS: any = null;
if (Platform.OS !== 'web') {
  try {
    const pkg = require('react-native-thermal-receipt-printer-image-qr');
    BLEPrinter = pkg.BLEPrinter;
    COMMANDS = pkg.COMMANDS;
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
      let text = "";
      text += `<CB>${config?.company_name || 'ByaHero Transit'}</CB>\n`;
      if (config?.client_name) text += `<C>${config.client_name}</C>\n`;
      if (config?.tin_number) text += `<C>TIN: ${config.tin_number}</C>\n`;
      text += "--------------------------------\n";
      
      if (config?.header_message) {
        text += `<C>${config.header_message}</C>\n`;
        text += "--------------------------------\n";
      }
      
      const pad = (label: string, value: string) => {
        const spaces = 32 - label.length - String(value).length;
        return spaces > 0 ? label + " ".repeat(spaces) + value + "\n" : label + " " + value + "\n";
      };

      text += pad("TICKET:", `${ticket.busNumber} ${ticket.ticketNumber}`);
      text += pad("DATE:", ticket.date);
      text += pad("TYPE:", ticket.discount);
      text += pad("BOARDED:", ticket.boarding);
      text += pad("ALIGHT:", ticket.alighting);
      
      text += "--------------------------------\n";
      text += pad("TOTAL:", `PHP ${Number(ticket.fare).toFixed(2)}`);
      
      if (config?.footer_message) {
        text += `\n<C>${config.footer_message}</C>`;
      }

      BLEPrinter.printBill(text);
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
