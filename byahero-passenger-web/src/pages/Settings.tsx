import React from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../components/PassengerNavbar';
import PassengerFooter from '../components/PassengerFooter';
import { MaterialIcons } from '../components/ui/MaterialIcons';

export const Settings: React.FC = () => {
  const navigate = useNavigate();

  const settingsSections = [
    {
      title: 'Alerts & Sharing',
      items: [
        {
          title: 'Smart Notifications',
          desc: 'Configure push alerts and schedules',
          icon: 'notifications_active',
          color: '#3b82f6',
          route: '/settings/smart-notifications',
        },
        {
          title: 'Privacy & Security',
          desc: 'Manage profile and visibility settings',
          icon: 'security',
          color: '#10b981',
          route: '/settings/privacy-security',
        },
        {
          title: 'Login Activity',
          desc: 'Recent login sessions and history',
          icon: 'history',
          color: '#6366f1',
          route: '/profile/login-activity',
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          title: 'Accessibility Settings',
          desc: 'High contrast and voice guidance',
          icon: 'accessibility',
          color: '#8b5cf6',
          route: '/settings/accessibility',
        },
        {
          title: 'Submit Feedback',
          desc: 'Report suggestions or issues',
          icon: 'rate_review',
          color: '#f59e0b',
          route: '/settings/feedback',
        },
      ],
    },
    {
      title: 'Legal & Info',
      items: [
        {
          title: 'Privacy Policy',
          desc: 'Read our data policy guidelines',
          icon: 'policy',
          color: '#64748b',
          route: '/settings/privacy',
        },
        {
          title: 'Terms of Service',
          desc: 'Read terms of use details',
          icon: 'description',
          color: '#64748b',
          route: '/settings/terms',
        },
        {
          title: 'About Us',
          desc: 'About the ByaHero application',
          icon: 'info',
          color: '#64748b',
          route: '/settings/about',
        },
      ],
    },
  ];

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Settings" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <h1 className="text-lg font-black text-slate-800 mb-1 px-1">Settings Portal</h1>
            <p className="text-xs text-slate-400 font-medium mb-5 px-1">
              Manage preferences, app visibility, and notification profiles
            </p>

            {settingsSections.map((section, secIdx) => (
              <div key={secIdx} className="mb-5">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
                  {section.title}
                </h2>

                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {section.items.map((item, itemIdx) => (
                    <div
                      key={itemIdx}
                      onClick={() => navigate(item.route)}
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center flex-1 mr-3">
                        <div
                          className="w-10 h-10 rounded-2xl flex justify-center items-center mr-3.5"
                          style={{ backgroundColor: `${item.color}15` }}
                        >
                          <MaterialIcons name={item.icon} size={20} color={item.color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-slate-700">{item.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 truncate">{item.desc}</div>
                        </div>
                      </div>
                      <MaterialIcons name="chevron_right" size={24} color="#cbd5e1" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default Settings;
