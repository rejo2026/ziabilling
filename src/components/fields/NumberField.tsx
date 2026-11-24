import React from 'react';
import FieldWrapper from './FieldWrapper';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  step?: string;
  helpText?: string;
  error?: string;
  bold?: boolean;
}

export default function NumberField({
  label, value, onChange, placeholder, required, disabled, min, max, step = '0.01', helpText, error, bold
}: NumberFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} error={error}>
      <input
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        className={`w-full bg-slate-950 border rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${bold ? 'font-bold' : ''} ${error ? 'border-rose-600' : 'border-slate-700'}`}
      />
    </FieldWrapper>
  );
}
