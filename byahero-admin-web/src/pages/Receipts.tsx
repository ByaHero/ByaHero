import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Bluetooth, 
  Save, 
  Loader2,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';
import PrinterModal from '../components/PrinterModal';
import { useAlertModal } from '../hooks/useAlertModal';
import { usePrinter } from '../hooks/usePrinter';

// Jagged tear-off edge SVG component representing realistic thermal receipt paper
const JaggedTearEdge = ({ flip = false }: { flip?: boolean }) => (
  <svg
    viewBox="0 0 280 8"
    className={`w-full h-2 text-white fill-current block ${flip ? 'rotate-180' : ''}`}
    preserveAspectRatio="none"
  >
    <path d="M0,8 L7,0 L14,8 L21,0 L28,8 L35,0 L42,8 L49,0 L56,8 L63,0 L70,8 L77,0 L84,8 L91,0 L98,8 L105,0 L112,8 L119,0 L126,8 L133,0 L140,8 L147,0 L154,8 L161,0 L168,8 L175,0 L182,8 L189,0 L196,8 L203,0 L210,8 L217,0 L224,8 L231,0 L238,8 L245,0 L252,8 L259,0 L266,8 L273,0 L280,8 Z" />
  </svg>
);

export default function Receipts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states aligned with the real conductor printed ticket
  const [companyName, setCompanyName] = useState('ByaHero');
  const [clientName, setClientName] = useState('Magnificat Transport Cooperative');
  const [headerMessage, setHeaderMessage] = useState('Welcome aboard!');
  const [footerMessage, setFooterMessage] = useState('Thank you for your cooperation');

  // Printer hook & modal state
  const printer = usePrinter();
  const [isPrinterModalVisible, setIsPrinterModalVisible] = useState(false);
  const isPrinterReady = !!printer.connectedPrinter;

  // Sample fare for preview
  const [sampleFare, setSampleFare] = useState<{ origin: string; destination: string; regular_fare: number } | null>(null);

  const { alertConfig, showAlert } = useAlertModal();

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await adminService.getReceiptConfig();
      if (res && res.success && res.config) {
        setCompanyName(res.config.company_name || 'ByaHero');
        setClientName(res.config.client_name || '');
        setHeaderMessage(res.config.header_message || 'Welcome aboard!');
        const rawFooter = res.config.footer_message || 'Thank you for your cooperation';
        const cleanedFooter = rawFooter.replace(/[\s\r\n]*-{3,}[\s\S]*$/, '').trim() || 'Thank you for your cooperation';
        setFooterMessage(cleanedFooter);
      }

      // Fetch fare for live preview
      try {
        const fareRes = await adminService.listFares();
        if (fareRes && fareRes.success && fareRes.fares && fareRes.fares.length > 0) {
          const fare = fareRes.fares[0];
          setSampleFare({
            origin: fare.origin_name || 'Caloocan',
            destination: fare.stop_name || fare.destination_name || 'Buco',
            regular_fare: Number(fare.regular_fare) || 12,
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const cleanedFooter = (footerMessage || 'Thank you for your cooperation')
        .replace(/[\s\r\n]*-{3,}[\s\S]*$/, '')
        .trim() || 'Thank you for your cooperation';

      const data = {
        company_name: companyName,
        client_name: clientName,
        tin_number: '', // Removed from config
        header_message: headerMessage,
        footer_message: cleanedFooter,
      };

      const res = await adminService.saveReceiptConfig(data);
      if (res && res.success) {
        setFooterMessage(cleanedFooter);
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

  const handleScanPrinters = async () => {
    try {
      const dev = await printer.scanDevices();
      if (dev) {
        showAlert('Connected', `Connected to ${dev.name || 'Printer'}`, 'success');
      }
    } catch (err: any) {
      showAlert('Connection Error', err.message || 'Failed to scan/connect printer.', 'error');
    }
  };

  const handleConnectDevice = async (device: any) => {
    try {
      await printer.connectPrinter(device);
      showAlert('Success', `Connected to ${device.name || 'Printer'}`, 'success');
    } catch (err: any) {
      showAlert('Connection Failed', err.message || 'Could not connect to printer.', 'error');
    }
  };

  const handleTestPrint = async () => {
    if (!isPrinterReady) {
      showAlert('Bluetooth Printer', 'Please connect a Bluetooth printer (e.g. PT-210) first.', 'warning');
      setIsPrinterModalVisible(true);
      return;
    }

    try {
      const ticketMock = {
        busNumber: 'L-00001',
        ticketNumber: '00119',
        date: '10/7/2026',
        time: '10:06 PM',
        discount: 'Senior',
        boarding: sampleFare ? sampleFare.origin : 'Caloocan',
        alighting: sampleFare ? sampleFare.destination : 'Buco',
        fare: sampleFare ? sampleFare.regular_fare : 12.0,
        quantity: 1,
      };
      const configMock = {
        company_name: companyName,
        client_name: clientName,
        header_message: headerMessage,
        footer_message: footerMessage,
      };

      await printer.printReceipt(ticketMock, configMock);
      showAlert('Test Print', 'Test receipt sent to printer.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Print Error', e.message || 'Failed to print receipt.', 'error');
    }
  };

  const handleModalTestPrint = async () => {
    try {
      await printer.testPrint();
      showAlert('Test Print', 'Test page sent to printer.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Print Error', e.message || 'Failed to send test print.', 'error');
    }
  };

  // Clean footer text so manual dashes or wraps do not break preview formatting
  const formatFooterText = (text: string) => {
    if (!text) return 'Thank you for your cooperation';
    return text.replace(/[\s\r\n]*-{3,}[\s\S]*$/, '').trim() || 'Thank you for your cooperation';
  };

  // Receipt preview exactly replicating the conductor's printed thermal receipt
  const ReceiptPreview = () => (
    <div className="bg-slate-100/80 p-5 sm:p-8 rounded-2xl items-center flex justify-center border border-slate-200/80">
      <div className="w-[280px] sm:w-[290px] filter drop-shadow-md select-none">
        {/* Top jagged cut edge */}
        <JaggedTearEdge flip={false} />

        {/* Pure white thermal paper body */}
        <div className="bg-white px-5 py-3 relative font-mono text-slate-800 text-[12px] sm:text-[13px] leading-tight">
          {/* Header block */}
          <div className="text-center pt-1 pb-1">
            <h4 className="font-bold text-base sm:text-lg tracking-tight text-slate-900 leading-snug">
              {companyName || 'ByaHero'}
            </h4>
            {!!clientName && (
              <p className="font-normal text-[12px] sm:text-[13px] text-slate-800 mt-0.5 leading-tight">
                {clientName}
              </p>
            )}
            <p className="font-normal text-[12px] sm:text-[13px] text-slate-800 mt-0.5 leading-tight">
              TICKET NO: 00119
            </p>
          </div>

          {/* Spacer before greeting */}
          <div className="h-2.5" />

          {/* Header Message */}
          <div className="text-center text-[12px] sm:text-[13px] text-slate-800 leading-normal whitespace-pre-line">
            {headerMessage || 'Welcome aboard!'}
          </div>

          {/* Full-width dashed divider */}
          <div className="border-b border-dashed border-slate-300 my-2.5 w-full" />

          {/* Meta Information (Date / Time / Bus / Pax) */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>DATE: 10/7/2026</span>
              <span>TIME: 10:06 PM</span>
            </div>
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>BUS: L-00001</span>
              <span>PAX: 1</span>
            </div>
          </div>

          {/* Full-width dashed divider */}
          <div className="border-b border-dashed border-slate-300 my-2.5 w-full" />

          {/* Trip / Fare details */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>TYPE:</span>
              <span className="font-normal">Senior</span>
            </div>
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>BOARDED:</span>
              <span className="font-normal text-right truncate max-w-[150px]">
                {sampleFare ? sampleFare.origin : 'Caloocan'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>ALIGHT:</span>
              <span className="font-normal text-right truncate max-w-[150px]">
                {sampleFare ? sampleFare.destination : 'Buco'}
              </span>
            </div>
            <div className="flex justify-between items-center text-[12px] sm:text-[13px]">
              <span>TOTAL:</span>
              <span className="font-normal text-right">
                PHP {sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '12.00'}
              </span>
            </div>
          </div>

          {/* Full-width dashed divider */}
          <div className="border-b border-dashed border-slate-300 my-2.5 w-full" />

          {/* Spacer before footer message */}
          <div className="h-2.5" />

          {/* Footer Message */}
          <div className="text-center font-mono text-[12px] sm:text-[13px] text-slate-800 leading-normal whitespace-pre-line px-1">
            {formatFooterText(footerMessage)}
          </div>

          {/* Closing full-width dashed divider */}
          <div className="border-b border-dashed border-slate-300 my-2.5 w-full" />

          {/* Bottom paper spacing */}
          <div className="h-2" />
        </div>

        {/* Bottom jagged cut edge */}
        <JaggedTearEdge flip={true} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Title & Description Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Receipt Configuration</h2>
          <p className="text-slate-500 text-sm mt-1">
            Configure the header, cooperative, and messages printed on physical tickets by the conductor&apos;s PT-210 portable thermal printer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 size={13} className="text-blue-600" />
            PT-210 58mm Standard
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="animate-spin text-[#1d72f8]" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Form Section */}
          <div className="w-full">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
                <Sparkles size={18} className="text-[#1d72f8]" />
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                  Ticket Content Settings
                </h3>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block tracking-wide">
                    COMPANY / BRAND NAME
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm transition"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. ByaHero"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Printed in large bold text at the top of the ticket.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block tracking-wide">
                    COOPERATIVE / CLIENT NAME
                  </label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm transition"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. Magnificat Transport Cooperative"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Transport cooperative or franchise operator name.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block tracking-wide">
                    HEADER MESSAGE
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-sm focus:outline-none focus:border-blue-500 focus:bg-white resize-none text-left transition"
                    value={headerMessage}
                    onChange={(e) => setHeaderMessage(e.target.value)}
                    placeholder="e.g. Welcome aboard!"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Greeting printed directly below the ticket number.
                  </p>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block tracking-wide">
                    FOOTER MESSAGE
                  </label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-sm focus:outline-none focus:border-blue-500 focus:bg-white resize-none text-left transition"
                    value={footerMessage}
                    onChange={(e) => setFooterMessage(e.target.value)}
                    placeholder="e.g. Thank you for your cooperation"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Closing appreciation note printed at the bottom of the ticket (dashed lines above and below are added automatically).
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1d72f8] hover:bg-blue-600 rounded-xl py-3.5 items-center shadow-sm hover:shadow flex justify-center text-white font-bold text-[14px] w-full transition cursor-pointer disabled:opacity-75"
                >
                  {saving ? (
                    <Loader2 size={18} className="animate-spin mr-2" />
                  ) : (
                    <Save size={18} className="mr-2" />
                  )}
                  <span>SAVE CONFIGURATION</span>
                </button>
              </form>
            </div>
          </div>

          {/* Preview Section */}
          <div className="w-full">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Printer size={18} className="text-[#64748b] mr-2" />
                    <h3 className="text-sm font-bold text-slate-800 tracking-wide uppercase">
                      Physical Ticket Preview
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPrinterModalVisible(true)}
                    className="flex items-center bg-gray-50 hover:bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200 transition cursor-pointer shadow-2xs"
                  >
                    <Bluetooth size={12} className={isPrinterReady ? 'text-[#3b82f6] mr-1.5' : 'text-[#94a3b8] mr-1.5'} />
                    <span className={`text-[10px] font-bold tracking-wider ${isPrinterReady ? 'text-blue-600' : 'text-slate-500'}`}>
                      {isPrinterReady ? 'CONNECTED' : 'CONNECT PRINTER'}
                    </span>
                  </button>
                </div>

                {/* The thermal receipt simulation */}
                <ReceiptPreview />

                <button
                  type="button"
                  onClick={handleTestPrint}
                  className={`${
                    isPrinterReady
                      ? 'bg-slate-800 hover:bg-slate-900 cursor-pointer shadow-sm'
                      : 'bg-slate-300 hover:bg-slate-400 cursor-pointer'
                  } rounded-xl py-3.5 mt-5 items-center flex justify-center text-white font-bold text-[14px] w-full transition`}
                >
                  <Printer size={18} className="mr-2" />
                  <span>TEST PRINT ON PT-210</span>
                </button>

                <p className="text-xs text-gray-400 mt-3 text-center px-4">
                  This preview replicates the exact layout printed by the conductor mobile app on 58mm thermal paper.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />

      {/* Dedicated Printer Modal */}
      <PrinterModal
        visible={isPrinterModalVisible}
        onClose={() => setIsPrinterModalVisible(false)}
        devices={printer.devices}
        pairedDevices={printer.pairedDevices}
        isScanning={printer.isScanning}
        onScan={handleScanPrinters}
        onConnect={handleConnectDevice}
        connectedPrinter={printer.connectedPrinter}
        onTestPrint={handleModalTestPrint}
        onDisconnect={printer.disconnectPrinter}
        onRemovePaired={printer.removePairedDevice}
      />
    </div>
  );
}
