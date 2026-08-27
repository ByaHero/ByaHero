import React from 'react';

interface SettingsRowSwitchProps {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  iconName?: string;
  iconColor?: string;
  isLast?: boolean;
  containerStyle?: string;
}

export function SettingsRowSwitch({
  title,
  description,
  value,
  onValueChange,
  iconName,
  iconColor = '#1e3a8a',
  isLast = true,
  containerStyle = ''
}: SettingsRowSwitchProps) {
  return (
    <div className={`flex flex-row items-center justify-between p-4 ${!isLast ? 'border-b border-slate-100' : ''} ${containerStyle}`}>
      <div className="flex flex-row items-center flex-1 mr-4">
        {iconName && (
          <div 
            className="w-10 h-10 rounded-2xl flex justify-center items-center mr-3.5"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <span className="material-icons text-[20px]" style={{ color: iconColor }}>
              {iconName}
            </span>
          </div>
        )}
        <div className="flex-1 flex flex-col">
          <span className="text-sm font-semibold text-slate-700">{title}</span>
          <span className="text-xs text-slate-400 mt-0.5 line-clamp-2">
            {description}
          </span>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={value}
          onChange={(e) => onValueChange(e.target.checked)}
        />
        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-300"></div>
      </label>
    </div>
  );
}
