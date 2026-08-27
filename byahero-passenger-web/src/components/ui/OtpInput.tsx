import React from 'react';

interface OtpInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerStyle?: string;
  inputStyle?: string;
}

export function OtpInput({ containerStyle = '', inputStyle = '', ...props }: OtpInputProps) {
  return (
    <div className={`flex flex-row items-center bg-[#e8efff] rounded-full px-5 mb-5 ${containerStyle}`}>
      <input
        type="text"
        placeholder="000000"
        maxLength={6}
        className={`flex-1 bg-transparent border-none outline-none text-[#0f172a] py-3 text-lg font-bold text-center tracking-[6px] placeholder:text-[#7a98c8] placeholder:tracking-normal ${inputStyle}`}
        {...props}
      />
    </div>
  );
}
