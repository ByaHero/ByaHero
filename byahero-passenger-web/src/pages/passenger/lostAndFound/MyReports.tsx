import React, { useState, useEffect } from 'react';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import AlertModal from '../../../components/AlertModal';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import { Loader2 } from 'lucide-react';

export const MyReports: React.FC = () => {
  const { user, serverUrl } = useAuth();

  const [reports, setReports] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((p) => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const pendingStored = localStorage.getItem('byahero_pending_lost_found') || '[]';
      const parsedPending = JSON.parse(pendingStored);
      setPendingQueue(parsedPending);

      let serverReports: any[] = [];
      try {
        const res = await fetch(`${serverUrl}/api/lost-and-found/my-reports`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data && data.reports) {
          serverReports = data.reports;
          localStorage.setItem('byahero_cached_my_reports', JSON.stringify(serverReports));
        }
      } catch (err) {
        const cached = localStorage.getItem('byahero_cached_my_reports') || '[]';
        serverReports = JSON.parse(cached);
      }

      setReports(serverReports);
    } catch (e) {
      console.warn('Failed to load reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleResolveReport = async (ticketId: number, itemType: string) => {
    showAlert(
      'Resolve Case',
      'Do you want to permanently mark this case as successfully closed?',
      'confirm',
      async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`${serverUrl}/api/lost-and-found/my-reports`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify({
              action: 'resolve',
              ticket_id: ticketId,
            }),
            credentials: 'include',
          });

          const data = await res.json();
          setIsLoading(false);

          if (data && data.success) {
            showAlert('Success', data.message || 'Report marked as resolved!', 'success');
            loadReports();
          } else {
            showAlert('Error', data.error || 'Action failed.', 'error');
          }
        } catch (err) {
          setIsLoading(false);
          showAlert('Error', 'Failed to communicate with the server.', 'error');
        }
      }
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700' };
    if (s === 'closed') return { bg: 'bg-red-50', border: 'border-red-100', text: 'text-red-700' };
    if (s === 'open') return { bg: 'bg-yellow-50', border: 'border-yellow-100', text: 'text-amber-700' };
    return { bg: 'bg-slate-100', border: 'border-slate-200', text: 'text-slate-500' };
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="My Reports" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            {isLoading ? (
              <div className="py-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
              </div>
            ) : pendingQueue.length === 0 && reports.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-center">
                <MaterialIcons name="description" size={64} color="#cbd5e1" />
                <span className="text-sm font-bold text-slate-400 mt-4">No active reports found.</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Pending Offline Items */}
                {pendingQueue.map((item, idx) => {
                  const statusStyle = getStatusStyle('pending');
                  return (
                    <div
                      key={`pending-${idx}`}
                      className={`bg-white rounded-3xl p-5 border shadow-sm ${statusStyle.border}`}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
                        <div className="flex items-center">
                          <MaterialIcons
                            name={item.type === 'lost' ? 'search' : 'inventory'}
                            size={18}
                            color={item.type === 'lost' ? '#ef4444' : '#10b981'}
                            className="mr-1.5"
                          />
                          <span className="text-xs font-black text-slate-800 uppercase">
                            {item.type} ITEM (PENDING SYNC)
                          </span>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full ${statusStyle.bg}`}>
                          <span className={`text-[10px] font-bold ${statusStyle.text}`}>PENDING</span>
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-3">
                        {item.description}
                      </p>

                      <div className="flex items-center text-xs text-slate-400 font-semibold">
                        <MaterialIcons name="calendar_month" size={14} color="#94a3b8" className="mr-1" />
                        <span className="mr-3">{formatDisplayDate(new Date(item.timestamp).toISOString())}</span>
                        {item.bus_number && <span>• Bus {item.bus_number}</span>}
                      </div>
                    </div>
                  );
                })}

                {/* Server Reports */}
                {reports.map((item, idx) => {
                  const statusStyle = getStatusStyle(item.status || 'open');
                  const isLost = (item.type || 'lost').toLowerCase() === 'lost';
                  return (
                    <div
                      key={`server-${idx}`}
                      className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm ${statusStyle.border}`}
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-3">
                        <div className="flex items-center">
                          <MaterialIcons
                            name={isLost ? 'search' : 'inventory'}
                            size={18}
                            color={isLost ? '#ef4444' : '#10b981'}
                            className="mr-1.5"
                          />
                          <span className="text-xs font-black text-slate-800 uppercase">
                            {item.type || 'LOST'} ITEM
                          </span>
                        </div>
                        <div className={`px-2.5 py-0.5 rounded-full ${statusStyle.bg}`}>
                          <span className={`text-[10px] font-bold ${statusStyle.text}`}>
                            {item.status ? item.status.toUpperCase() : 'OPEN'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-semibold text-slate-700 leading-relaxed mb-3">
                        {item.item_description || item.description}
                      </p>

                      <div className="flex items-center text-xs text-slate-400 font-semibold">
                        <MaterialIcons name="calendar_month" size={14} color="#94a3b8" className="mr-1" />
                        <span className="mr-3">{formatDisplayDate(item.created_at)}</span>
                        {item.bus_number && <span>• Bus {item.bus_number}</span>}
                      </div>

                      {(item.status || 'open').toLowerCase() === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleResolveReport(item.id, item.type || 'lost')}
                          className="flex items-center mt-4 bg-[#1e3a8a] hover:bg-blue-900 py-2 px-4 rounded-xl shadow-sm self-end text-xs font-bold text-white ml-auto"
                        >
                          <MaterialIcons name="check_circle" size={14} color="#ffffff" className="mr-1" />
                          <span>Mark as {isLost ? 'Found' : 'Returned'}</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default MyReports;
