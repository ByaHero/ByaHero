import { useState, useEffect } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let BLEPrinter: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let COMMANDS: any = {};
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const printerLib = require('react-native-thermal-receipt-printer-image-qr');
  BLEPrinter = printerLib.BLEPrinter;
  COMMANDS = printerLib.COMMANDS;
} catch (e) {
  // Library not available, printer features will be disabled
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
      
      const parseDevices = scanned.map(d => ({
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

      // Sanitize non-ASCII characters (like \u202F Narrow No-Break Space) that break printer column counting
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

      // Aggressively strip any accidental trailing newlines from earlier lines
      BLEPrinter.printBill(text.trimEnd(), { tailingLine: false });
    } catch (e: any) {
      console.error(e);
      Alert.alert('Print Error', e.message || 'Failed to print receipt.');
    }
  };

  const testPrint = async () => {
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

      BLEPrinter.printBill(text.trimEnd(), { tailingLine: false });
      Alert.alert('Test Print', 'Test page sent to printer.');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Print Error', e.message || 'Failed to send test print.');
    }
  };

  return {
    devices,
    pairedDevices,
    isScanning,
    connectedPrinter,
    scanDevices,
    connectPrinter,
    printReceipt,
    testPrint,
  };
}
