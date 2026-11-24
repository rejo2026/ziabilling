import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Building2, 
  DollarSign, 
  Calendar, 
  Download, 
  Printer, 
  CheckCircle2, 
  Percent, 
  TrendingUp, 
  Receipt,
  FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface UaeVat201Props {
  isRTL: boolean;
}

export default function UaeVat201Page({ isRTL }: UaeVat201Props) {
  const [vatData, setVatData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadVatData = () => {
    setLoading(true);
    fetch('http://localhost:4200/api/reports/vat-return-201')
      .then(res => res.json())
      .then(d => {
        setVatData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadVatData();
  }, []);

  const exportVatExcel = () => {
    if (!vatData) return;
    const rows = [
      ['UAE FEDERAL TAX AUTHORITY - VAT 201 RETURN FORM'],
      ['TRN:', vatData.trn],
      ['Taxpayer:', vatData.companyName],
      ['Tax Period:', vatData.taxPeriod],
      ['Currency:', 'AED'],
      [],
      ['Box 1: Standard Rated Supplies by Emirate', 'Taxable Amount (AED)', 'VAT Amount (5%)'],
      ...(vatData.standardRatedSupplies || []).map((e: any) => [
        `Standard Rated Supplies in ${e.emirate}`,
        Number(e.taxableSupplies).toFixed(2),
        Number(e.vatAmount).toFixed(2)
      ]),
      ['Total Taxable Sales & Output VAT', Number(vatData.totalTaxableSales).toFixed(2), Number(vatData.totalOutputVat).toFixed(2)],
      [],
      ['Box 9: Standard Rated Expenses (Recoverable Input VAT)', '', Number(vatData.recoverableInputTax).toFixed(2)],
      [],
      ['Box 12: NET VAT DUE / (RECOVERABLE)', '', Number(vatData.netVatPayable).toFixed(2)]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'VAT201_FTA');
    XLSX.writeFile(wb, `UAE_FTA_VAT_201_${vatData.taxPeriod}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-500" />
            <span>{isRTL ? 'إقرار ضريبة القيمة المضافة الإماراتي - نموذج 201' : 'UAE FTA VAT 201 Return Filing'}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRTL 
              ? 'الملخص الرسمي لتوريدات ومبيعات قطع الغيار عبر كافة الإمارات مع احتساب ضريبة المخرجات والمدخلات'
              : 'Official FTA Form 201 breakdown by Emirate for standard-rated automotive spare parts supplies and recoverable input tax.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportVatExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition-colors shadow-lg shadow-emerald-600/30 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isRTL ? 'تصدير إكسل رسمي' : 'Export FTA Excel'}</span>
          </button>
        </div>
      </div>

      {vatData && (
        <>
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {isRTL ? 'إجمالي المبيعات الخاضعة للضريبة' : 'Total Taxable Sales'}
              </span>
              <div className="text-2xl font-bold text-white mt-1">
                AED {Number(vatData.totalTaxableSales || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-blue-400 mt-1 block">5% UAE Standard Rate</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {isRTL ? 'ضريبة المخرجات المحصلة (Output VAT)' : 'Total Output VAT (5%)'}
              </span>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                AED {Number(vatData.totalOutputVat || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">From Customer Sales</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {isRTL ? 'ضريبة المدخلات القابلة للاسترداد' : 'Recoverable Input VAT'}
              </span>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                AED {Number(vatData.recoverableInputTax || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">From Purchases & Expenses</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm bg-gradient-to-br from-slate-900 to-blue-950/40">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                {isRTL ? 'صافي الضريبة المستحقة للهيئة' : 'Net VAT Due to FTA'}
              </span>
              <div className="text-2xl font-bold text-blue-400 mt-1">
                AED {Number(vatData.netVatPayable || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block">Net Tax Liability</span>
            </div>
          </div>

          {/* Box 1 Table: Standard Rated Supplies per Emirate */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {isRTL ? 'الجدول 1: التوريدات الخاضعة للنسبة الأساسية بحسب كل إمارة' : 'Box 1: Standard Rated Supplies by Emirate'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isRTL ? 'توزيع المبيعات والضريبة المحصلة وفقاً للموقع الفعلي للمتجر أو التسليم' : 'FTA requirement: report sales revenue and output VAT according to store/destination Emirate.'}
                </p>
              </div>
              <span className="px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-xs font-mono font-bold">
                TRN: {vatData.trn}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">{isRTL ? 'الإمارة' : 'Emirate'}</th>
                    <th className="p-3.5 text-right">{isRTL ? 'المبلغ الخاضع للضريبة (AED)' : 'Taxable Amount (AED)'}</th>
                    <th className="p-3.5 text-right">{isRTL ? 'مبلغ الضريبة 5% (AED)' : 'VAT Amount (5% AED)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {(vatData.standardRatedSupplies || []).map((row: any) => (
                    <tr key={row.emirate} className="hover:bg-slate-800/40">
                      <td className="p-3.5 font-sans font-semibold text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-500" />
                        <span>{row.emirate}</span>
                      </td>
                      <td className="p-3.5 text-right">
                        {Number(row.taxableSupplies).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right text-emerald-400 font-bold">
                        {Number(row.vatAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-950 font-bold text-white">
                    <td className="p-3.5 font-sans uppercase">
                      {isRTL ? 'الإجمالي (Total Supplies)' : 'Total Standard Rated Supplies'}
                    </td>
                    <td className="p-3.5 text-right">
                      AED {Number(vatData.totalTaxableSales).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3.5 text-right text-emerald-400">
                      AED {Number(vatData.totalOutputVat).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
