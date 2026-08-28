import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';

export const StaticPages: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageType = () => {
    const path = location.pathname;
    if (path.includes('privacy')) return 'privacy';
    if (path.includes('terms')) return 'terms';
    return 'about';
  };

  const page = getPageType();

  const getPageContent = () => {
    switch (page) {
      case 'privacy':
        return {
          title: 'Privacy Policy',
          body: (
            <div className="space-y-4 text-left">
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                At ByaHero, your privacy is our top priority. We collect and use your data solely to provide real-time bus tracking and emergency notification services.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">1. Data Collection</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                We collect your name, email address, phone number, and real-time GPS location coordinates when tracking is active. This data is transmitted securely to our servers.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">2. Location Services</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                Your location coordinates are processed only when tracking is turned on to show your proximity to buses and allow circle members to track you during commutes.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">3. Security</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                All user and location transmission channels are secured using standard SSL encryption. Your session details are hashed and cached securely on your local device.
              </p>
            </div>
          ),
        };
      case 'terms':
        return {
          title: 'Terms of Service',
          body: (
            <div className="space-y-4 text-left">
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                By using ByaHero, you agree to comply with our usage conditions. Please review our terms before proceeding.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">1. User Obligations</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                You agree to provide accurate registration details (name, email, phone) and must not misuse the tracking portal or trigger fraudulent SOS panic alerts.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">2. Service Availability</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                ByaHero provides real-time public transit tracking as-is. We strive for maximum uptime but do not guarantee 100% accuracy of bus coordinates due to network variances.
              </p>
              <h3 className="text-sm font-bold text-[#1e3a8a] mt-2">3. Emergency Feature Limitation</h3>
              <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                The SOS panic button is a tool to alert your circle and operators. It is not a replacement for national emergency services (911/police).
              </p>
            </div>
          ),
        };
      case 'about':
      default:
        return {
          title: 'About ByaHero',
          body: (
            <div className="flex flex-col items-center text-center">
              <img
                src="/images/byaheroLogo.png"
                alt="ByaHero Logo"
                className="w-28 h-28 mb-4 object-contain"
              />
              <h2 className="text-lg font-black text-[#1e3a8a] mb-3">Welcome to ByaHero</h2>
              <p className="text-sm text-slate-600 font-semibold leading-relaxed mb-6">
                ByaHero is dedicated to revolutionizing the way passengers experience bus transport. Our goal is to provide seamless tracking of bus schedules, timely notifications, and intelligent insights to enhance your travel experience.
                <br /><br />
                By leveraging modern technology, we aim to connect passengers and operators with the tools they need for reliable and efficient transportation. Whether you're planning your daily commute or a long journey, ByaHero is here to make it stress-free and convenient.
              </p>

              <div className="border-t border-slate-100 w-full pt-5">
                <h4 className="text-sm font-bold text-slate-800 mb-1">Contact Us</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">Email: support@byahero.app</p>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">Phone: +63 43 778 1234</p>
              </div>
            </div>
          ),
        };
    }
  };

  const content = getPageContent();

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle={content.title} showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              {content.body}

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mt-6 w-full bg-[#1e3a8a] hover:bg-blue-900 py-3 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow-md transition-colors cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default StaticPages;
