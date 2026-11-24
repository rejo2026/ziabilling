import React from 'react';
import FieldWrapper from './FieldWrapper';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'tel' | 'password';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  helpText?: string;
  error?: string;
  mono?: boolean;
}

export default function TextField({
  label, value, onChange, type = 'text', placeholder, required, disabled, readOnly, helpText, error, mono
}: TextFieldProps) {
  return (
    <FieldWrapper label={label} required={required} helpText={helpText} error={error}>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        readOnly={readOnly}
        className={`w-full bg-slate-950 border rounded p-2 text-white disabled:opacity-50 disabled:cursor-not-allowed ${mono ? 'font-mono' : ''} ${error ? 'border-rose-600' : 'border-slate-700'}`}
      />
    </FieldWrapper>
  );
}
