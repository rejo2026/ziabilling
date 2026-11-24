import React from 'react';
import FieldWrapper from './FieldWrapper';

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
}

export default function DateField({ label, value, onChange, required, disabled, helpText, error }: DateFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} error={error}>
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full bg-slate-950 border rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-rose-600' : 'border-slate-700'}`}
      />
    </FieldWrapper>
  );
}
