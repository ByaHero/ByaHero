import React, { useState } from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  containerStyle?: string;
  inputStyle?: string;
  isPassword?: boolean;
}

export function FormInput({ containerStyle = '', inputStyle = '', isPassword, ...props }: FormInputProps) {
  const [secureTextEntry, setSecureTextEntry] = useState(isPassword);

  return (
    <div className={`flex flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4 ${containerStyle}`}>
      <input
        type={secureTextEntry ? "password" : "text"}
        className={`flex-1 bg-transparent border-none outline-none text-[#0f172a] py-3 text-sm font-semibold placeholder:text-[#7a98c8] ${inputStyle}`}
        {...props}
      />
      {isPassword && (
        <button 
          type="button" 
          onClick={() => setSecureTextEntry(!secureTextEntry)}
          className="ml-2 focus:outline-none"
        >
          <span className="material-icons text-[18px] text-[#7a98c8]">
            {secureTextEntry ? "visibility_off" : "visibility"}
          </span>
        </button>
      )}
    </div>
  );
}
