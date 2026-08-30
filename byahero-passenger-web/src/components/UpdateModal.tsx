import React from 'react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export default function UpdateModal() {
  const { isUpdateAvailable, updateInfo, currentVersion, dismissUpdate } = useAppUpdate();

  if (!isUpdateAvailable || !updateInfo) {
    return null;
  }

  const handleUpdate = () => {
    if (updateInfo.download_url) {
      window.open(updateInfo.download_url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/65 flex justify-center items-center p-6 z-[9999] overflow-y-auto">
      <div className="w-full max-w-[360px] bg-white rounded-[20px] p-6 flex flex-col items-center shadow-xl my-8">
        <div className="w-[68px] h-[68px] rounded-full bg-sky-100 flex justify-center items-center mb-4">
          <span className="material-icons text-[42px] text-[#0F3878]">
            system_update
          </span>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-1.5 m-0">
          New Update Available!
        </h2>
        <span className="text-[13px] font-semibold text-[#0F3878] bg-sky-50 px-2.5 py-1 rounded-full mb-3.5">
          v{currentVersion} ➔ v{updateInfo.latest_version}
        </span>

        {updateInfo.release_notes && (
          <div className="w-full bg-gray-50 rounded-lg p-3 mb-3.5 border border-gray-200">
            <h3 className="text-xs font-bold text-gray-600 mb-1 m-0">What's New:</h3>
            <p className="text-[13px] text-gray-700 leading-snug m-0 whitespace-pre-wrap">
              {updateInfo.release_notes}
            </p>
          </div>
        )}

        <p className="text-[13px] text-gray-500 text-center leading-snug mb-5 m-0">
          {updateInfo.force_update
            ? 'A required update is available. Please update to continue using ByaHero.'
            : 'Please download the latest version to get the newest features and improvements.'}
        </p>

        <div className="w-full flex flex-col gap-2.5">
          <button 
            onClick={handleUpdate}
            className="flex flex-row bg-[#0F3878] rounded-xl py-3.5 items-center justify-center border-none cursor-pointer"
          >
            <span className="material-icons text-white text-[20px] mr-1.5">
              file_download
            </span>
            <span className="text-white font-bold text-[15px]">Update Now</span>
          </button>

          {!updateInfo.force_update && (
            <button 
              onClick={dismissUpdate}
              className="py-2.5 items-center justify-center bg-transparent border-none cursor-pointer"
            >
              <span className="text-gray-500 font-semibold text-[14px]">Maybe Later</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
