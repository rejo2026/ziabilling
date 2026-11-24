import React from 'react';

interface FieldWrapperProps {
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}

export default function FieldWrapper({ label, required, helpText, error, children }: FieldWrapperProps) {
  return (
    <div>
      <label className="text-slate-400 block mb-1">
        {label}{required && <span className="text-rose-400"> *</span>}
      </label>
      {children}
      {helpText && !error && <p className="text-[10px] text-slate-500 mt-1">{helpText}</p>}
      {error && <p className="text-[10px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
