import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  Bluetooth, 
  Save, 
  Loader2, 
  FileText 
} from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';
import PrinterModal from '../components/PrinterModal';
import { useAlertModal } from '../hooks/useAlertModal';
import { usePrinter } from '../hooks/usePrinter';

export default function Receipts() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('ByaHero Transit');
  const [clientName, setClientName] = useState('');
  const [tinNumber, setTinNumber] = useState('000-000-000-000');
  const [headerMessage, setHeaderMessage] = useState('Welcome aboard!');
  const [footerMessage, setFooterMessage] = useState('Thank you for riding with us!');

  // Printer hook & modal state matching byahero-admin
  const printer = usePrinter();
  const [isPrinterModalVisible, setIsPrinterModalVisible] = useState(false);
  const isPrinterReady = !!printer.connectedPrinter;

  // Summary config states
  const [summaryTitle, setSummaryTitle] = useState('TRIP SUMMARY');
  const [showConductor, setShowConductor] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [showBreakdown, setShowBreakdown] = useState(true);
  const [showFirstLast, setShowFirstLast] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);

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

      // Fetch summary report configuration
      try {
        const sumRes = await adminService.getSummaryConfig();
        if (sumRes && sumRes.success && sumRes.config) {
          setSummaryTitle(sumRes.config.summary_title);
          setShowConductor(sumRes.config.show_conductor);
          setShowRoute(sumRes.config.show_route);
          setShowBreakdown(sumRes.config.show_breakdown);
          setShowFirstLast(sumRes.config.show_first_last);
          setShowSignatures(sumRes.config.show_signatures);
        }
      } catch (e) {
        console.warn('Failed to load summary config', e);
      }

      // Fetch fare for live preview
      try {
        const fareRes = await adminService.listFares();
        if (fareRes && fareRes.success && fareRes.fares && fareRes.fares.length > 0) {
          const fare = fareRes.fares[0];
          setSampleFare({
            origin: fare.origin_name || 'TANAUAN',
            destination: fare.stop_name || fare.destination_name || 'LAUREL',
            regular_fare: Number(fare.regular_fare) || 25,
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
      const data = {
        company_name: companyName,
        client_name: clientName,
        tin_number: tinNumber,
        header_message: headerMessage,
        footer_message: footerMessage,
      };

      const res = await adminService.saveReceiptConfig(data);
      if (res && res.success) {
        showAlert('Success', 'Receipt configuration saved.', 'success');
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

  const handleSaveSummary = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSummary(true);
    try {
      const data = {
        summary_title: summaryTitle,
        show_conductor: showConductor,
        show_route: showRoute,
        show_breakdown: showBreakdown,
        show_first_last: showFirstLast,
        show_signatures: showSignatures,
      };

      const res = await adminService.saveSummaryConfig(data);
      if (res && res.success) {
        showAlert('Success', 'Summary configuration saved successfully.', 'success');
      } else {
        showAlert('Error', res?.error || 'Failed to save configuration.', 'error');
      }
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'An error occurred while saving summary configuration.', 'error');
    } finally {
      setSavingSummary(false);
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
        busNumber: 'BUS-001',
        ticketNumber: 'TEST',
        date: '08/20/2026',
        time: '1:00 PM',
        discount: 'REGULAR',
        boarding: sampleFare ? sampleFare.origin : 'TANAUAN',
        alighting: sampleFare ? sampleFare.destination : 'LAUREL',
        fare: sampleFare ? sampleFare.regular_fare : 25.0,
        quantity: 1,
      };
      const configMock = {
        company_name: companyName,
        client_name: clientName,
        tin_number: tinNumber,
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

  const ReceiptPreview = () => (
    <div className="bg-gray-100 p-4 rounded-xl items-center flex justify-center">
      <div className="w-[300px] bg-white border border-gray-300 p-4 rounded-lg shadow-sm font-sans text-slate-800">
        <h4 className="text-center font-bold text-lg mb-1">{companyName || 'COMPANY NAME'}</h4>
        {!!clientName && (
          <p className="text-center font-semibold text-sm mb-1">{clientName}</p>
        )}
        {!!tinNumber && (
          <p className="text-center text-xs text-gray-500 mb-1">TIN: {tinNumber}</p>
        )}
        <p className="text-center text-xs text-gray-600 mb-4">TICKET NO: TEST</p>

        <p className="text-center text-sm mb-4 border-b border-dashed border-gray-300 pb-2">
          {headerMessage || 'Header text here'}
        </p>

        <div className="flex justify-between mb-1 text-xs">
          <span>DATE: 08/20/2026</span>
          <span>TIME: 1:00 PM</span>
        </div>
        <div className="flex justify-between mb-1 text-xs">
          <span>BUS: BUS-001</span>
          <span>PAX: 1</span>
        </div>

        <div className="mt-2 mb-2 w-full border-t border-dashed border-gray-300 pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span>TYPE:</span>
            <span className="text-right font-medium">REGULAR</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>BOARDED:</span>
            <span className="text-right max-w-[70%] truncate font-medium">
              {sampleFare ? sampleFare.origin : 'TANAUAN'}
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span>ALIGHT:</span>
            <span className="text-right max-w-[70%] truncate font-medium">
              {sampleFare ? sampleFare.destination : 'LAUREL'}
            </span>
          </div>
        </div>

        <div className="flex justify-between mb-4 border-b border-dashed border-gray-300 pb-2 text-xs font-bold pt-1">
          <span>TOTAL:</span>
          <span>PHP {sampleFare ? Number(sampleFare.regular_fare).toFixed(2) : '25.00'}</span>
        </div>

        <p className="text-center text-xs italic text-gray-500 mt-2">
          {footerMessage || 'Footer text here'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Title & Description Header matching byahero-admin */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Receipt Format</h2>
        <p className="text-slate-500 text-sm mt-1">
          Configure the text printed on physical tickets by the conductor&apos;s PT-210 portable printer.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20 bg-white rounded-2xl border border-gray-200">
          <Loader2 className="animate-spin text-[#1d72f8]" size={36} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="w-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">COMPANY NAME</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. ByaHero Transit"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">CLIENT COMPANY NAME</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. ABC Corporation"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">TIN NUMBER / TAX ID</label>
                  <input
                    type="text"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm font-mono"
                    value={tinNumber}
                    onChange={(e) => setTinNumber(e.target.value)}
                    placeholder="e.g. 123-456-789-000"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">HEADER MESSAGE</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-sm focus:outline-none focus:border-blue-500 focus:bg-white resize-none text-left"
                    value={headerMessage}
                    onChange={(e) => setHeaderMessage(e.target.value)}
                    placeholder="Text below the title"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-gray-500 mb-1 block">FOOTER MESSAGE</label>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 h-20 text-sm focus:outline-none focus:border-blue-500 focus:bg-white resize-none text-left"
                    value={footerMessage}
                    onChange={(e) => setFooterMessage(e.target.value)}
                    placeholder="Terms or thank you message"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#1d72f8] hover:bg-blue-600 rounded-full py-4 items-center shadow-md flex justify-center text-white font-bold text-[15px] w-full transition cursor-pointer disabled:opacity-75"
                >
                  {saving ? (
                    <Loader2 size={20} className="animate-spin mr-2" />
                  ) : (
                    <Save size={20} className="mr-2" />
                  )}
                  <span>SAVE CONFIGURATION</span>
                </button>
              </form>
            </div>
          </div>

          {/* Preview Section */}
          <div className="w-full">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <Printer size={20} className="text-[#64748b] mr-2" />
                    <h3 className="text-sm font-bold text-slate-700">PT-210 RECEIPT PREVIEW</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsPrinterModalVisible(true)}
                    className="flex items-center bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 transition cursor-pointer"
                  >
                    <Bluetooth size={12} className={isPrinterReady ? 'text-[#3b82f6] mr-1' : 'text-[#94a3b8] mr-1'} />
                    <span className={`text-[10px] font-bold ${isPrinterReady ? 'text-blue-500' : 'text-slate-500'}`}>
                      {isPrinterReady ? 'CONNECTED' : 'CONNECT'}
                    </span>
                  </button>
                </div>

                <ReceiptPreview />

                <button
                  type="button"
                  onClick={handleTestPrint}
                  className={`${
                    isPrinterReady
                      ? 'bg-slate-800 hover:bg-slate-900 cursor-pointer'
                      : 'bg-slate-300 hover:bg-slate-400 cursor-pointer'
                  } rounded-full py-3 mt-6 items-center shadow-md flex justify-center text-white font-bold text-[14px] w-full transition`}
                >
                  <Printer size={18} className="mr-2" />
                  <span>TEST PRINT</span>
                </button>

                <p className="text-xs text-gray-400 mt-4 text-center px-4">
                  Note: Connection works natively on Chrome/Edge via Web Bluetooth. Print layout depends on 58mm printer width.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trip Summary / Z-Report Configuration Section */}
      {!loading && (
        <div className="grid grid-cols-1 gap-6 mt-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 pb-4 mb-5 border-b border-gray-100">
              <FileText size={18} className="text-[#0f3878]" />
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Trip Summary / Z-Report Configuration
              </h3>
            </div>

            <form onSubmit={handleSaveSummary} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500 mb-1 block">
                  Report Title
                </label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-slate-800 bg-gray-50 focus:outline-none focus:border-blue-500 focus:bg-white text-sm"
                  value={summaryTitle}
                  onChange={(e) => setSummaryTitle(e.target.value)}
                  placeholder="e.g. TRIP SUMMARY"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showConductor}
                    onChange={(e) => setShowConductor(e.target.checked)}
                    className="w-4 h-4 text-[#1d72f8] rounded border-gray-300 focus:ring-[#1d72f8]"
                  />
                  <span className="text-xs font-bold text-slate-700">Show Conductor Name</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showRoute}
                    onChange={(e) => setShowRoute(e.target.checked)}
                    className="w-4 h-4 text-[#1d72f8] rounded border-gray-300 focus:ring-[#1d72f8]"
                  />
                  <span className="text-xs font-bold text-slate-700">Show Route Information</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showBreakdown}
                    onChange={(e) => setShowBreakdown(e.target.checked)}
                    className="w-4 h-4 text-[#1d72f8] rounded border-gray-300 focus:ring-[#1d72f8]"
                  />
                  <span className="text-xs font-bold text-slate-700">Show Fare Breakdown</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showFirstLast}
                    onChange={(e) => setShowFirstLast(e.target.checked)}
                    className="w-4 h-4 text-[#1d72f8] rounded border-gray-300 focus:ring-[#1d72f8]"
                  />
                  <span className="text-xs font-bold text-slate-700">Show First &amp; Last Ticket</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition">
                  <input
                    type="checkbox"
                    checked={showSignatures}
                    onChange={(e) => setShowSignatures(e.target.checked)}
                    className="w-4 h-4 text-[#1d72f8] rounded border-gray-300 focus:ring-[#1d72f8]"
                  />
                  <span className="text-xs font-bold text-slate-700">Show Signature Lines</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={savingSummary}
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-5 rounded-full text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm cursor-pointer disabled:opacity-60 mt-4"
              >
                {savingSummary ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                <span>Save Summary Configuration</span>
              </button>
            </form>
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

      {/* Dedicated Printer Modal matching byahero-admin */}
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
