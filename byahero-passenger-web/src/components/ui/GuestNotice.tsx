import React from 'react';

interface GuestNoticeProps {
  message: string;
  type?: 'info' | 'warning';
  actionText?: string;
  onActionPress?: () => void;
}

export function GuestNotice({ message, type = 'info', actionText, onActionPress }: GuestNoticeProps) {
  const isWarning = type === 'warning';
  const bgColor = isWarning ? 'bg-yellow-50' : 'bg-blue-50';
  const borderColor = isWarning ? 'border-yellow-100' : 'border-blue-100';
  const iconColor = isWarning ? 'text-amber-700' : 'text-blue-700';
  const textColor = isWarning ? 'text-amber-800/90' : 'text-blue-800/90';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-3xl p-4 mb-4 flex flex-row items-center`}>
      <span className={`material-icons text-[20px] ${iconColor} mr-2`}>
        {isWarning ? 'warning' : 'info'}
      </span>
      <p className={`text-xs ${textColor} leading-relaxed flex-1 m-0`}>
        {message}{' '}
        {actionText && (
          <button 
            onClick={onActionPress}
            className="font-bold text-[#1e3a8a] underline bg-transparent border-none p-0 cursor-pointer ml-1"
          >
            {actionText}
          </button>
        )}
      </p>
    </div>
  );
}
