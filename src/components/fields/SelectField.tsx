import React from 'react';
import FieldWrapper from './FieldWrapper';

interface SelectFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<string | { value: string; label: string }>;
  required?: boolean;
  disabled?: boolean;
  helpText?: string;
  error?: string;
}

export default function SelectField({ label, value, onChange, options, required, disabled, helpText, error }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} error={error}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className={`w-full bg-slate-950 border rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-rose-600' : 'border-slate-700'}`}
      >
        {options.map((opt, i) => {
          const value_ = typeof opt === 'string' ? opt : opt.value;
          const label_ = typeof opt === 'string' ? opt : opt.label;
          return <option key={i} value={value_}>{label_}</option>;
        })}
      </select>
    </FieldWrapper>
  );
}
