import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Bluetooth, 
  Save, 
  Loader2, 
  FileText, 
  BluetoothConnected
} from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Receipts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('ByaHero Transit');
  const [clientName, setClientName] = useState('');
  const [tinNumber, setTinNumber] = useState('000-000-000-000');
  const [headerMessage, setHeaderMessage] = useState('Welcome aboard!');
  const [footerMessage, setFooterMessage] = useState('Thank you for riding with us!');

  // Web Bluetooth state
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [printerDeviceName, setPrinterDeviceName] = useState<string>('');
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [connectingBle, setConnectingBle] = useState(false);
  const [printingTest, setPrintingTest] = useState(false);

  // Sample fare for preview
  const [sampleFare, setSampleFare] = useState<{ origin: string; destination: string; regular_fare: number } | null>(null);

  const { alertConfig, showAlert } = useAlertModal();

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReceiptConfig();
      if (res && res.success && res.config) {
        setCompanyName(res.config.company_name || 'ByaHero Transit');
        setClientName(res.config.client_name || '');
        setTinNumber(res.config.tin_number || '');
        setHeaderMessage(res.config.header_message || '');
        setFooterMessage(res.config.footer_message || '');
      }

      // Fetch fare for live preview
      try {
        const fareRes = await adminService.listFares();
        if (fareRes && fareRes.success && fareRes.fares && fareRes.fares.length > 0) {
          const fare = fareRes.fares[0];
          setSampleFare({
            origin: fare.origin_name || 'TANAUAN',
            destination: fare.stop_name || fare.destination_name || 'LAUREL',
            regular_fare: Number(fare.regular_fare) || 25
          });
        }
      } catch (e) {
        console.warn('Failed to load fares for preview', e);
      }
    } catch (e) {
      console.error('Failed to fetch receipt config', e);
      showAlert('Error', 'Could not load receipt configuration from the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
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
      if (res && res.success) {
        showAlert('Success', 'Receipt configuration saved successfully.', 'success');
      } else {
        showAlert('Error', res?.error || 'Failed to save configuration.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'An error occurred while saving configuration.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const connectWebBluetooth = async () => {
    if (typeof navigator === 'undefined' || !(navigator as any).bluetooth) {
      showAlert(
        'Web Bluetooth Not Supported',
        'Web Bluetooth is not supported in this browser. Please use a Chromium-based browser like Google Chrome or Microsoft Edge.',
        'warning'
      );
      return;
    }

    setConnectingBle(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Standard ESC/POS
          'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // PT-210 specific
        ],
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsPrinterConnected(false);
        setPrinterDeviceName('');
        setBleDevice(null);
        setBleCharacteristic(null);
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
        setPrinterDeviceName(device.name || 'PT-210 Printer');
        showAlert('Connected', `Successfully connected to ${device.name || 'Thermal Printer'}!`, 'success');
      } else {
        showAlert('Error', 'No writable characteristic found on this Bluetooth device.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      if (e.message && !e.message.toLowerCase().includes('cancelled')) {
        showAlert('Connection Failed', e.message || 'Could not connect to Bluetooth printer.', 'error');
      }
    } finally {
      setConnectingBle(false);
    }
  };

  const disconnectWebBluetooth = () => {
    if (bleDevice && bleDevice.gatt.connected) {
      bleDevice.gatt.disconnect();
    }
    setIsPrinterConnected(false);
    setPrinterDeviceName('');
    setBleDevice(null);
    setBleCharacteristic(null);
  };

  const handleTestPrint = async () => {
    if (!isPrinterConnected || !bleCharacteristic) {
      showAlert('Printer Not Connected', 'Please connect a Bluetooth thermal printer (e.g. PT-210) first.', 'warning');
      return;
    }

    setPrintingTest(true);
    try {
      const encoder = new TextEncoder();
      let text = '';
      const C = '\x1B\x61\x01'; // Center align
      const L = '\x1B\x61\x00'; // Left align
      const BOLD_ON = '\x1B\x45\x01';
      const BOLD_OFF = '\x1B\x45\x00';

      text += `${C}${BOLD_ON}${companyName || 'BYAHERO TRANSIT'}${BOLD_OFF}\n`;
      if (clientName) text += `${C}${clientName}\n`;
      if (tinNumber) text += `${C}TIN: ${tinNumber}\n`;
      text += `${C}TICKET NO: TEST-001\n`;
      text += '--------------------------------\n';

      if (headerMessage) {
        text += `${C}${headerMessage}\n`;
        text += '--------------------------------\n';
      }

      const printRow = (left: string, right: string) => {
        const spaces = 32 - left.length - String(right).length;
        return spaces > 0 ? left + ' '.repeat(spaces) + right + '\n' : left + ' ' + right + '\n';
      };

      const now = new Date();
      const dateStr = now.toLocaleDateString();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      text += `${L}`;
      text += printRow(`DATE: ${dateStr}`, `TIME: ${timeStr}`);
      text += printRow('BUS: BUS-001', 'PAX: 1');
      text += '--------------------------------\n';
      text += printRow('TYPE:', 'REGULAR');
      text += printRow('BOARDED:', sampleFare ? sampleFare.origin : 'TANAUAN');
      text += printRow('ALIGHT:', sampleFare ? sampleFare.destination : 'LAUREL');
      text += printRow('TOTAL:', `PHP ${sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '25.00'}`);
      text += '--------------------------------\n';

      if (footerMessage) {
        text += `\n${C}${footerMessage}\n`;
      }
      text += '\n\n';

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

      showAlert('Test Print Sent', 'Test receipt commands sent to thermal printer.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Print Error', e.message || 'Failed to print test receipt.', 'error');
    } finally {
      setPrintingTest(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Receipt Format & Printing</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure header, tax, and footer lines for conductors' PT-210 portable thermal printers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isPrinterConnected ? (
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-bold">
              <BluetoothConnected size={14} className="text-emerald-600" />
              <span>{printerDeviceName || 'Connected'}</span>
              <button 
                onClick={disconnectWebBluetooth}
                className="ml-2 text-slate-400 hover:text-red-500 transition text-[11px] underline cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={connectWebBluetooth}
              disabled={connectingBle}
              className="inline-flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer border border-slate-200"
            >
              {connectingBle ? <Loader2 size={14} className="animate-spin" /> : <Bluetooth size={14} />}
              Connect Bluetooth Printer
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-slate-100">
              <FileText size={18} className="text-[#0f3878]" />
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Configuration Fields
              </h3>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  Company Name (Main Header)
                </label>
                <input
                  type="text"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. ByaHero Transit"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  Client / Cooperative Company Name
                </label>
                <input
                  type="text"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Batangas Transport Cooperative"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  TIN Number / Tax Identification
                </label>
                <input
                  type="text"
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium font-mono"
                  value={tinNumber}
                  onChange={(e) => setTinNumber(e.target.value)}
                  placeholder="e.g. 000-000-000-000"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  Header Greeting / Notice Message
                </label>
                <textarea
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium h-20 resize-none"
                  value={headerMessage}
                  onChange={(e) => setHeaderMessage(e.target.value)}
                  placeholder="Text printed below ticket header"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">
                  Footer Message / Terms
                </label>
                <textarea
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 font-medium h-20 resize-none"
                  value={footerMessage}
                  onChange={(e) => setFooterMessage(e.target.value)}
                  placeholder="Thank you message or ride conditions"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-sm cursor-pointer disabled:opacity-60 mt-4"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Configuration
              </button>
            </form>
          </div>

          {/* Preview & Print Section */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Printer size={18} className="text-[#0f3878]" />
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                    58mm PT-210 Live Preview
                  </h3>
                </div>
                <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                  32 columns
                </span>
              </div>

              {/* Realistic Thermal Paper Simulation */}
              <div className="flex justify-center p-4 bg-slate-100 rounded-2xl border border-slate-200 shadow-inner">
                <div className="w-[280px] bg-white border border-slate-300 p-5 rounded-lg shadow-md font-mono text-[11px] text-slate-800 leading-relaxed">
                  <div className="text-center font-black text-sm uppercase mb-0.5 tracking-tight">
                    {companyName || 'COMPANY NAME'}
                  </div>
                  {clientName && (
                    <div className="text-center font-semibold text-[11px] text-slate-600 mb-0.5">
                      {clientName}
                    </div>
                  )}
                  {tinNumber && (
                    <div className="text-center text-[10px] text-slate-500 mb-1">
                      TIN: {tinNumber}
                    </div>
                  )}
                  <div className="text-center text-[10px] text-slate-500 mb-2">
                    TICKET NO: TEST-001
                  </div>

                  <div className="border-b border-dashed border-slate-300 my-2"></div>

                  {headerMessage && (
                    <>
                      <div className="text-center text-[10px] text-slate-600 italic my-2">
                        {headerMessage}
                      </div>
                      <div className="border-b border-dashed border-slate-300 my-2"></div>
                    </>
                  )}

                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>DATE: 08/20/2026</span>
                    <span>TIME: 01:00 PM</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600 mb-2">
                    <span>BUS: BUS-001</span>
                    <span>PAX: 1</span>
                  </div>

                  <div className="border-b border-dashed border-slate-300 my-2"></div>

                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">TYPE:</span>
                      <span className="font-bold">REGULAR</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">BOARDED:</span>
                      <span className="truncate max-w-[150px] text-right">
                        {sampleFare ? sampleFare.origin : 'TANAUAN'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-bold">ALIGHT:</span>
                      <span className="truncate max-w-[150px] text-right">
                        {sampleFare ? sampleFare.destination : 'LAUREL'}
                      </span>
                    </div>
                  </div>

                  <div className="border-b border-dashed border-slate-300 my-2"></div>

                  <div className="flex justify-between items-center text-xs font-black pt-1">
                    <span>TOTAL:</span>
                    <span>PHP {sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '25.00'}</span>
                  </div>

                  {footerMessage && (
                    <>
                      <div className="border-b border-dashed border-slate-300 my-2"></div>
                      <div className="text-center text-[10px] italic text-slate-500 mt-2">
                        {footerMessage}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Test Print Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleTestPrint}
                disabled={printingTest || !isPrinterConnected}
                className={`w-full inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer ${
                  isPrinterConnected
                    ? 'bg-slate-900 text-white hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                }`}
              >
                {printingTest ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Printer size={16} />
                )}
                {isPrinterConnected ? 'SEND TEST PRINT TO PT-210' : 'Connect Bluetooth Printer to Test Print'}
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2 font-medium">
                Note: Web Bluetooth requires Google Chrome, Microsoft Edge, or a Web Bluetooth supported browser.
              </p>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
