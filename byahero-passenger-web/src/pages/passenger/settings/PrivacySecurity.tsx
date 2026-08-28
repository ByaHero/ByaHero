import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import AlertModal from '../../../components/AlertModal';

export const PrivacySecurity: React.FC = () => {
  const navigate = useNavigate();
  const [locationServices, setLocationServices] = useState(true);

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
    type: 'info',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'info',
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

  useEffect(() => {
    const cachedLocation = localStorage.getItem('byahero_location_services');
    if (cachedLocation !== null) {
      setLocationServices(cachedLocation === '1');
    }
  }, []);

  const handleToggleLocation = (value: boolean) => {
    setLocationServices(value);
    localStorage.setItem('byahero_location_services', value ? '1' : '0');
    if (!value) {
      showAlert(
        'Location Services Disabled',
        'Bus tracking and sharing may not work properly while this is disabled.',
        'warning'
      );
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Privacy & Security" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            {/* Banner */}
            <div className="bg-[#1e3a8a] rounded-3xl p-5 shadow-sm mb-4 text-white">
              <h2 className="text-base font-bold text-white mb-2">Privacy and Security</h2>
              <p className="text-xs text-blue-100/90 leading-relaxed">
                Control which features can access your data and location.{' '}
                <button
                  type="button"
                  onClick={() => navigate('/settings/privacy')}
                  className="text-[#fbbf24] underline font-semibold cursor-pointer"
                >
                  Learn more...
                </button>
              </p>
            </div>

            {/* Permissions Switches */}
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
              Permissions
            </h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5 p-4 flex items-center justify-between">
              <div className="flex items-center flex-1 mr-3">
                <MaterialIcons name="location_on" size={24} color="#1e3a8a" className="mr-3" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Location Services</h3>
                  <p className="text-xs text-slate-400 mt-0.5 font-semibold">
                    Allow ByaHero to access your location
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={locationServices}
                onChange={(e) => handleToggleLocation(e.target.checked)}
                className="w-5 h-5 accent-[#1e3a8a] rounded cursor-pointer"
              />
            </div>

            {/* Additional Resources */}
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
              Additional Resources
            </h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
              <div
                onClick={() => navigate('/settings/privacy')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center">
                  <MaterialIcons name="description" size={20} color="#64748b" className="mr-3.5" />
                  <span className="text-sm font-semibold text-slate-700">Privacy Policy</span>
                </div>
                <MaterialIcons name="chevron_right" size={24} color="#cbd5e1" />
              </div>

              <div
                onClick={() => navigate('/settings/terms')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center">
                  <MaterialIcons name="gavel" size={20} color="#64748b" className="mr-3.5" />
                  <span className="text-sm font-semibold text-slate-700">Terms of Service</span>
                </div>
                <MaterialIcons name="chevron_right" size={24} color="#cbd5e1" />
              </div>
            </div>
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
export default PrivacySecurity;
