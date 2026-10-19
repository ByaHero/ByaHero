import React from 'react';
import { 
  Printer, 
  Bluetooth, 
  CheckCircle2, 
  X, 
  Loader2, 
  Trash2 
} from 'lucide-react';
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
  onTestPrint?: () => void;
  onDisconnect?: () => void;
  onRemovePaired?: (macAddress: string) => void;
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
  onRemovePaired,
}: Props) {
  if (!visible) return null;

  const renderDevice = (device: IPrinterDevice, idx: number, isPairedSection = false) => {
    const address = device.macAddress || device.id || '';
    const isConnected = connectedPrinter && (connectedPrinter.macAddress === address || connectedPrinter.id === address);

    return (
      <div
        key={`${address}-${idx}`}
        className={`flex items-center justify-between p-4 bg-white rounded-xl mb-2 border transition ${
          isConnected
            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
            : 'border-gray-200 hover:border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => onConnect(device)}
          className="flex items-center flex-1 text-left cursor-pointer focus:outline-none"
        >
          <div
            className={`p-2.5 rounded-xl mr-3 ${
              isConnected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'
            }`}
          >
            <Printer size={22} />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-bold text-slate-800 text-sm truncate">{device.name || 'Unknown Device'}</h4>
            <p className="text-xs text-slate-500 font-mono truncate">{address || 'Bluetooth Device'}</p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {isConnected && (
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
              CONNECTED
            </span>
          )}

          {isPairedSection && onRemovePaired && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemovePaired(address);
              }}
              title="Remove from saved"
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-50 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg p-6 shadow-2xl max-h-[85vh] sm:max-h-[75vh] flex flex-col border border-slate-200 animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-200 rounded-xl text-slate-800">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Connect Printer</h3>
              <p className="text-xs text-slate-500">PT-210 & Bluetooth 58mm Thermal Printers</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-gray-200 hover:bg-gray-300 rounded-full transition text-slate-600 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Connected Printer Status Banner */}
        {connectedPrinter && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 shadow-xs">
            <div className="flex items-center flex-1 min-w-0 mr-3">
              <CheckCircle2 size={22} className="text-blue-600 shrink-0 mr-2.5" />
              <div className="min-w-0">
                <span className="text-blue-700 font-bold text-xs uppercase tracking-wide block">CONNECTED</span>
                <p className="text-blue-600 text-xs font-medium truncate" title={connectedPrinter.name || connectedPrinter.macAddress}>
                  {connectedPrinter.name || connectedPrinter.macAddress}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {onTestPrint && (
                <button
                  type="button"
                  onClick={onTestPrint}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg px-3 py-2 cursor-pointer transition shadow-xs"
                >
                  Test Print
                </button>
              )}
              {onDisconnect && (
                <button
                  type="button"
                  onClick={onDisconnect}
                  className="text-slate-500 hover:text-red-600 text-xs font-bold px-2 py-1.5 transition cursor-pointer"
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scan Action Button */}
        <button
          type="button"
          onClick={onScan}
          disabled={isScanning}
          className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl py-3 flex justify-center items-center mb-6 font-bold text-sm transition cursor-pointer shadow-sm disabled:opacity-75"
        >
          {isScanning ? (
            <>
              <Loader2 size={18} className="animate-spin mr-2" />
              <span>Scanning for Printers...</span>
            </>
          ) : (
            <>
              <Bluetooth size={18} className="mr-2 text-blue-400" />
              <span>Scan for Printers</span>
            </>
          )}
        </button>

        {/* Device List Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {pairedDevices.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 mb-3 ml-2 tracking-wider">PAIRED DEVICES</h4>
              {pairedDevices.map((d, i) => renderDevice(d, i, true))}
            </div>
          )}

          {devices.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-500 mb-3 ml-2 mt-4 tracking-wider">AVAILABLE DEVICES</h4>
              {devices.map((d, i) => renderDevice(d, i, false))}
            </div>
          )}

          {!isScanning && pairedDevices.length === 0 && devices.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="p-4 bg-slate-100 rounded-full mb-3 text-slate-300">
                <Printer size={40} />
              </div>
              <p className="text-slate-500 font-bold text-sm">No Bluetooth printers found.</p>
              <p className="text-slate-400 text-xs mt-1">Tap &quot;Scan for Printers&quot; to search and pair your PT-210 device.</p>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="mt-4 pt-3 border-t border-slate-200 text-center">
          <p className="text-[11px] text-slate-400">
            Ensure your PT-210 printer is turned on and Bluetooth is enabled on your device.
          </p>
        </div>
      </div>
    </div>
  );
}
