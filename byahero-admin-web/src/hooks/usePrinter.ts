import { useState, useEffect, useRef } from 'react';

export interface IPrinterDevice {
  name: string;
  macAddress: string;
  id?: string;
  lastConnected?: string;
}

const STORAGE_KEY = 'byahero_paired_printers';

export function usePrinter() {
  const [devices, setDevices] = useState<IPrinterDevice[]>([]);
  const [pairedDevices, setPairedDevices] = useState<IPrinterDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectedPrinter, setConnectedPrinter] = useState<IPrinterDevice | null>(null);

  const bleDeviceRef = useRef<any>(null);
  const bleCharacteristicRef = useRef<any>(null);
  const devicesMapRef = useRef<Map<string, any>>(new Map());

  const isSupported = typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;

  // Load paired devices from localStorage and Web Bluetooth permissions on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setPairedDevices(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load saved printer devices', e);
    }

    // If getDevices() is available, check for previously authorized devices
    if (isSupported && (navigator as any).bluetooth?.getDevices) {
      (navigator as any).bluetooth.getDevices().then((knownDevices: any[]) => {
        if (knownDevices && knownDevices.length > 0) {
          const mapped: IPrinterDevice[] = knownDevices.map((d) => {
            devicesMapRef.current.set(d.id, d);
            return {
              name: d.name || 'PT-210 Printer',
              macAddress: d.id,
              id: d.id,
            };
          });
          setPairedDevices((prev) => {
            const combined = [...prev];
            for (const item of mapped) {
              if (!combined.some((p) => p.macAddress === item.macAddress)) {
                combined.push(item);
              }
            }
            return combined;
          });
        }
      }).catch((e: any) => console.warn('Could not query permitted bluetooth devices', e));
    }
  }, [isSupported]);

  const savePairedDevice = (dev: IPrinterDevice) => {
    setPairedDevices((prev) => {
      const filtered = prev.filter((d) => d.macAddress !== dev.macAddress);
      const updated = [dev, ...filtered];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not persist paired devices', e);
      }
      return updated;
    });
  };

  const removePairedDevice = (macAddress: string) => {
    setPairedDevices((prev) => {
      const updated = prev.filter((d) => d.macAddress !== macAddress);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not update paired devices', e);
      }
      return updated;
    });
    if (connectedPrinter?.macAddress === macAddress) {
      disconnectPrinter();
    }
  };

  const connectToBleDevice = async (device: any) => {
    if (!device) throw new Error('Invalid device reference');

    device.addEventListener('gattserverdisconnected', () => {
      setConnectedPrinter(null);
      bleCharacteristicRef.current = null;
      bleDeviceRef.current = null;
    });

    const server = await device.gatt.connect();
    bleDeviceRef.current = device;

    let characteristic: any = null;

    try {
      const services = await server.getPrimaryServices();
      for (const service of services) {
        try {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              characteristic = char;
              break;
            }
          }
        } catch (e) {
          // Some services may fail to enumerate characteristics, ignore and continue
        }
        if (characteristic) break;
      }
    } catch (e) {
      console.warn('Primary service scan error', e);
    }

    if (!characteristic) {
      throw new Error('No writable ESC/POS characteristic found on this device. Ensure this is a thermal printer.');
    }

    bleCharacteristicRef.current = characteristic;
  };

  const scanDevices = async (): Promise<IPrinterDevice | null> => {
    if (!isSupported) {
      throw new Error('Web Bluetooth is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
    }

    setIsScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PT-210 specific
          '0000fff0-0000-1000-8000-00805f9b34fb', // MTP-II / POS
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC transparent
        ],
      });

      if (!device) return null;

      const printerDevice: IPrinterDevice = {
        name: device.name || 'PT-210 Printer',
        macAddress: device.id,
        id: device.id,
        lastConnected: new Date().toLocaleDateString(),
      };

      devicesMapRef.current.set(device.id, device);

      // Add to available devices
      setDevices((prev) => {
        const without = prev.filter((d) => d.macAddress !== device.id);
        return [printerDevice, ...without];
      });

      // Auto-connect on selection
      await connectToBleDevice(device);
      setConnectedPrinter(printerDevice);
      savePairedDevice(printerDevice);

      return printerDevice;
    } catch (err: any) {
      if (
        err.name === 'NotFoundError' ||
        err.message?.toLowerCase().includes('cancelled') ||
        err.message?.toLowerCase().includes('user cancelled')
      ) {
        return null;
      }
      throw err;
    } finally {
      setIsScanning(false);
    }
  };

  const connectPrinter = async (device: IPrinterDevice) => {
    setIsScanning(true);
    try {
      let bleDev = devicesMapRef.current.get(device.macAddress || device.id || '');

      if (!bleDev && (navigator as any).bluetooth?.getDevices) {
        const knownDevices = await (navigator as any).bluetooth.getDevices();
        bleDev = knownDevices.find((d: any) => d.id === device.macAddress || d.id === device.id);
      }

      if (!bleDev) {
        // If not found in current browser session, invoke scan to prompt device picker
        await scanDevices();
        return;
      }

      await connectToBleDevice(bleDev);
      setConnectedPrinter(device);
      savePairedDevice(device);
    } catch (err: any) {
      console.error('Failed to connect to printer', err);
      throw err;
    } finally {
      setIsScanning(false);
    }
  };

  const disconnectPrinter = () => {
    try {
      if (bleDeviceRef.current && bleDeviceRef.current.gatt?.connected) {
        bleDeviceRef.current.gatt.disconnect();
      }
    } catch (e) {
      console.warn('Error during disconnect', e);
    }
    bleDeviceRef.current = null;
    bleCharacteristicRef.current = null;
    setConnectedPrinter(null);
  };

  const sendPayloadToBle = async (payload: Uint8Array) => {
    const char = bleCharacteristicRef.current;
    if (!char) {
      throw new Error('Printer is not connected.');
    }

    const CHUNK_SIZE = 128; // Safe chunk size for Bluetooth LE MTU
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
      const chunk = payload.slice(i, i + CHUNK_SIZE);
      if (char.properties.writeWithoutResponse) {
        await char.writeValueWithoutResponse(chunk);
      } else {
        await char.writeValue(chunk);
      }
      // Small delay between chunks to avoid buffer overflow on PT-210
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  };

  const printReceipt = async (ticket: any, config: any) => {
    if (!connectedPrinter || !bleCharacteristicRef.current) {
      throw new Error('Please connect a Bluetooth printer (e.g. PT-210) first.');
    }

    const encoder = new TextEncoder();
    let text = '';
    const C = '\x1B\x61\x01'; // Center align
    const L = '\x1B\x61\x00'; // Left align
    const BOLD_ON = '\x1B\x45\x01';
    const BOLD_OFF = '\x1B\x45\x00';

    text += `${C}${BOLD_ON}${config?.company_name || 'ByaHero'}${BOLD_OFF}\n`;
    if (config?.client_name) text += `${C}${config.client_name}\n`;
    text += `${C}TICKET NO: ${ticket?.ticketNumber || '00119'}\n`;

    if (config?.header_message) {
      text += `\n${C}${config.header_message}\n`;
    } else {
      text += '\n';
    }
    text += '--------------------------------\n';

    const printRow = (left: string, right: string) => {
      const spaces = 32 - left.length - String(right).length;
      return spaces > 0 ? left + ' '.repeat(spaces) + right + '\n' : left + ' ' + right + '\n';
    };

    const dateStr = (ticket?.date || new Date().toLocaleDateString('en-US'))
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    let justDate = dateStr;
    let justTime = ticket?.time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    if (dateStr.includes(' ')) {
      const parts = dateStr.split(' ');
      justDate = parts[0].replace(',', '');
      justTime = parts.slice(1).join(' ').replace(/(\d{1,2}:\d{2}):\d{2}/, '$1');
    }

    text += `${L}`;
    text += printRow(`DATE: ${justDate}`, justTime ? `TIME: ${justTime}` : '');
    text += printRow(`BUS: ${ticket?.busNumber || 'L-00001'}`, `PAX: ${ticket?.quantity || '1'}`);
    text += '--------------------------------\n';
    text += printRow('TYPE:', String(ticket?.discount || 'Senior'));
    text += printRow('BOARDED:', String(ticket?.boarding || 'Caloocan'));
    text += printRow('ALIGHT:', String(ticket?.alighting || 'Buco'));
    text += printRow('TOTAL:', `PHP ${Number(ticket?.fare || 12).toFixed(2)}`);
    text += '--------------------------------\n';

    if (config?.footer_message) {
      const cleanFooter = String(config.footer_message).replace(/[\s\r\n]*-{3,}[\s\S]*$/, '').trim();
      text += `\n${C}${cleanFooter}\n`;
      text += '--------------------------------\n';
    }
    text += '\n\n\n';

    const initCmd = new Uint8Array([0x1B, 0x40]);
    const textData = encoder.encode(text);
    const payload = new Uint8Array(initCmd.length + textData.length);
    payload.set(initCmd);
    payload.set(textData, initCmd.length);

    await sendPayloadToBle(payload);
  };

  const testPrint = async () => {
    if (!connectedPrinter || !bleCharacteristicRef.current) {
      throw new Error('Please connect a Bluetooth printer (e.g. PT-210) first.');
    }

    const encoder = new TextEncoder();
    const now = new Date().toLocaleString();
    let text = '';
    const C = '\x1B\x61\x01'; // Center align
    const BOLD_ON = '\x1B\x45\x01';
    const BOLD_OFF = '\x1B\x45\x00';

    text += `${C}${BOLD_ON}BYAHERO TRANSIT${BOLD_OFF}\n`;
    text += '--------------------------------\n';
    text += `${C}** PRINTER TEST PAGE **\n`;
    text += '--------------------------------\n';
    text += `${C}${now}\n`;
    text += '--------------------------------\n';
    text += `${C}Printer is working correctly.\n`;
    text += `${C}Ready to print receipts.\n\n\n\n`;

    const initCmd = new Uint8Array([0x1B, 0x40]);
    const textData = encoder.encode(text);
    const payload = new Uint8Array(initCmd.length + textData.length);
    payload.set(initCmd);
    payload.set(textData, initCmd.length);

    await sendPayloadToBle(payload);
  };

  return {
    devices,
    pairedDevices,
    isScanning,
    connectedPrinter,
    isSupported,
    scanDevices,
    connectPrinter,
    disconnectPrinter,
    removePairedDevice,
    printReceipt,
    testPrint,
  };
}
