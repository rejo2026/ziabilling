import React from 'react';
import { ChevronLeft, RefreshCw } from 'lucide-react';

interface SecondaryAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: string[];
  primaryAction?: { label: string; icon?: React.ReactNode; onClick: () => void };
  secondaryActions?: SecondaryAction[];
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function PageHeader({
  title, description, breadcrumb, primaryAction, secondaryActions, onBack, onRefresh, refreshing
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        {breadcrumb && breadcrumb.length > 0 && (
          <p className="text-[11px] text-slate-500 mb-1">{breadcrumb.join(' / ')}</p>
        )}
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="text-slate-400 hover:text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <h2 className="text-lg font-bold text-white">{title}</h2>
        </div>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        )}
        {secondaryActions?.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
          >
            {a.icon} {a.label}
          </button>
        ))}
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md"
          >
            {primaryAction.icon} {primaryAction.label}
          </button>
        )}
      </div>
    </div>
  );
}
