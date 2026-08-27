import React from 'react';

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  isLoading?: boolean;
  containerStyle?: string;
  textStyle?: string;
}

export function PrimaryButton({ title, isLoading, containerStyle = '', textStyle = '', disabled, ...props }: PrimaryButtonProps) {
  return (
    <button
      disabled={isLoading || disabled}
      className={`self-center bg-[#1d72f8] rounded-full py-3.5 w-full flex items-center justify-center shadow-sm mb-4 disabled:opacity-70 transition-opacity ${containerStyle}`}
      {...props}
    >
      {isLoading ? (
        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      ) : (
        <span className={`text-white text-sm font-bold tracking-wider ${textStyle}`}>{title}</span>
      )}
    </button>
  );
}
