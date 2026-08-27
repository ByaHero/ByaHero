import React from 'react';

interface SuccessScreenProps {
  title: string;
  message: string;
}

export function SuccessScreen({ title, message }: SuccessScreenProps) {
  return (
    <div className="flex flex-col items-center py-10">
      <span className="material-icons text-[64px] text-emerald-500">
        check_circle
      </span>
      <h2 className="text-lg font-black text-[#1e3a8a] mt-4 mb-2 m-0">{title}</h2>
      <p className="text-xs text-slate-400 font-semibold text-center leading-relaxed px-5 m-0">
        {message}
      </p>
      <p className="text-xs text-slate-300 font-semibold mt-8 m-0">Redirecting you home...</p>
    </div>
  );
}
