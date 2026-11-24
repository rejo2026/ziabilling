import React from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  variant?: Variant;
  loading?: boolean;
  icon?: React.ReactNode;
  confirmMessage?: string;
  onClick?: () => void;
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700',
  danger: 'bg-rose-600 hover:bg-rose-500 text-white',
  ghost: 'bg-transparent hover:bg-slate-800 text-slate-300',
};

export default function Button({
  variant = 'primary',
  loading = false,
  icon,
  confirmMessage,
  disabled,
  onClick,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  function handleClick() {
    if (isDisabled || !onClick) return;
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    onClick();
  }

  return (
    <button
      type={rest.type || 'button'}
      onClick={handleClick}
      disabled={isDisabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}
