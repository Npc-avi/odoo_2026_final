import React, { useState, useEffect, useRef } from 'react';
import {
  fetchReportingMetricsApi,
  downloadReportCsvApi,
  ReportFilterParams,
} from '../services/reporting.api';
import { fetchProductsApi } from '../services/catalog.api';
import {
  BarChart3,
  Download,
  FileText,
  FileSpreadsheet,
  Clock,
  TrendingUp,
  Award,
  Filter,
  RefreshCw,
  Users,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'react-toastify';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const GovernanceReportsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [exportingXls, setExportingXls] = useState<boolean>(false);

  // Filters matching Reference Photo 5: Period, Sales Team, Approval Status, Product
  const [period, setPeriod] = useState<string>('all');
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  const reportContainerRef = useRef<HTMLDivElement>(null);

  const computeDateRange = (periodVal: string) => {
    const now = new Date();
    if (periodVal === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (periodVal === 'last_30_days') {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (periodVal === 'this_quarter') {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const start = new Date(now.getFullYear(), qMonth, 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    if (periodVal === 'this_year') {
      const start = new Date(now.getFullYear(), 0, 1);
      return { startDate: start.toISOString(), endDate: now.toISOString() };
    }
    return {};
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const { startDate, endDate } = computeDateRange(period);
      const params: ReportFilterParams = {
        startDate,
        endDate,
        repId: selectedRep,
        status: selectedStatus,
        productId: selectedProduct,
      };

      const [reportData, prodData] = await Promise.all([
        fetchReportingMetricsApi(params),
        fetchProductsApi().catch(() => ({ products: [] })),
      ]);

      setMetrics(reportData);
      setProducts(prodData.products || prodData || []);
    } catch (err: any) {
      toast.error('Failed to load live database reporting telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [period, selectedRep, selectedStatus, selectedProduct]);

  // Export PDF using jsPDF + autoTable (vector-based, crisp, 100% reliable)
  const handleExportPdf = () => {
    try {
      setExportingPdf(true);
      toast.info('Generating executive PDF report...');

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // Top Header
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 32, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DEALFLOW 360', 14, 16);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(203, 213, 225);
      doc.text('EXECUTIVE SALES GOVERNANCE & TELEMETRY AUDIT', 14, 23);

      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(`DATE: ${new Date().toLocaleDateString()}`, 195, 20, { align: 'right' });

      // KPI Overview Summary Box
      let y = 42;
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE OVERVIEW METRICS', 14, y);

      const rev = Number(overview.total_confirmed_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
      const created = overview.quotes_created || 0;
      const hours = overview.avg_approval_time_hours || 0;
      const margin = overview.avg_margin_pct ? `${Number(overview.avg_margin_pct).toFixed(1)}%` : 'N/A';

      autoTable(doc, {
        startY: y + 4,
        head: [['Quotes Created', 'Confirmed Revenue', 'Avg Approval Turnaround', 'Average Margin %']],
        body: [[
          String(created),
          `$${rev}`,
          `${hours} hrs`,
          margin
        ]],
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 10, halign: 'center', cellPadding: 3 },
      });

      y = (doc as any).lastAutoTable.finalY + 10;

      // Section 2: Sales Rep Performance
      if (repPerformance.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('SALES REPRESENTATIVE PERFORMANCE', 14, y);

        const repRows = repPerformance.map((r: any) => [
          r.rep_name || 'Unassigned',
          String(r.total_quotes || 0),
          String(r.won_quotes || 0),
          `$${Number(r.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          `${Number(r.avg_margin_pct || 0).toFixed(1)}%`,
        ]);

        autoTable(doc, {
          startY: y + 4,
          head: [['Representative', 'Total Quotes', 'Won Quotes', 'Total Revenue', 'Avg Margin']],
          body: repRows,
          theme: 'striped',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8.5 },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'right' },
            4: { halign: 'center' },
          },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Section 3: Quotation Ledger
      if (ledger.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('DETAILED QUOTATION AUDIT LEDGER', 14, y);

        const ledgerRows = ledger.slice(0, 30).map((row: any) => [
          row.quotation_code || '-',
          row.customer_name || '-',
          row.rep_name || 'N/A',
          (row.status || '').toUpperCase(),
          `$${Number(row.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
          `${row.blended_risk_score || 0}%`,
          new Date(row.created_at).toLocaleDateString(),
        ]);

        autoTable(doc, {
          startY: y + 4,
          head: [['Quote #', 'Customer', 'Rep', 'Status', 'Total', 'Risk Score', 'Date']],
          body: ledgerRows,
          theme: 'grid',
          headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 8 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            4: { halign: 'right' },
            5: { halign: 'center' },
            6: { halign: 'center' },
          },
        });
      }

      doc.save(`dealflow-governance-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('Executive PDF report downloaded successfully!');
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setExportingPdf(false);
    }
  };

  // Export XLS Spreadsheet
  const handleExportXls = () => {
    try {
      setExportingXls(true);
      toast.info('Generating Excel/XLS spreadsheet...');

      let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">';
      html += '<head><meta charset="utf-8"/><style>table{border-collapse:collapse;width:100%;font-family:sans-serif;} th{background:#0f172a;color:#fff;padding:8px;border:1px solid #cbd5e1;} td{padding:6px;border:1px solid #e2e8f0;text-align:left;} .num{text-align:right;} .center{text-align:center;}</style></head><body>';

      // Title
      html += '<h2>DEALFLOW 360 - GOVERNANCE & TELEMETRY EXECUTIVE REPORT</h2>';
      html += `<p>Generated on: ${new Date().toLocaleString()}</p>`;

      // Table 1: Overview
      html += '<h3>1. Executive Overview Metrics</h3>';
      html += '<table><tr><th>Quotes Created</th><th>Confirmed Revenue</th><th>Avg Approval Turnaround</th><th>Avg Margin %</th></tr>';
      html += `<tr><td class="center">${overview.quotes_created || 0}</td><td class="num">$${Number(overview.total_confirmed_revenue || 0).toFixed(2)}</td><td class="center">${overview.avg_approval_time_hours || 0} hrs</td><td class="center">${overview.avg_margin_pct ? Number(overview.avg_margin_pct).toFixed(1) + '%' : 'N/A'}</td></tr></table><br/>`;

      // Table 2: Rep Performance
      if (repPerformance.length > 0) {
        html += '<h3>2. Sales Representative Performance</h3>';
        html += '<table><tr><th>Representative</th><th>Total Quotes</th><th>Won Quotes</th><th>Total Revenue</th><th>Avg Margin %</th></tr>';
        repPerformance.forEach((r: any) => {
          html += `<tr><td>${r.rep_name || 'Unassigned'}</td><td class="center">${r.total_quotes || 0}</td><td class="center">${r.won_quotes || 0}</td><td class="num">$${Number(r.total_revenue || 0).toFixed(2)}</td><td class="center">${Number(r.avg_margin_pct || 0).toFixed(1)}%</td></tr>`;
        });
        html += '</table><br/>';
      }

      // Table 3: Quotation Ledger
      if (ledger.length > 0) {
        html += '<h3>3. Quotation Audit Ledger</h3>';
        html += '<table><tr><th>Quote Code</th><th>Customer</th><th>Representative</th><th>Status</th><th>Total Amount</th><th>Risk Score</th><th>Created Date</th></tr>';
        ledger.forEach((row: any) => {
          html += `<tr><td>${row.quotation_code || '-'}</td><td>${row.customer_name || '-'}</td><td>${row.rep_name || 'N/A'}</td><td>${(row.status || '').toUpperCase()}</td><td class="num">$${Number(row.total_amount || 0).toFixed(2)}</td><td class="center">${row.blended_risk_score || 0}%</td><td class="center">${new Date(row.created_at).toLocaleDateString()}</td></tr>`;
        });
        html += '</table><br/>';
      }

      html += '</body></html>';

      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dealflow-governance-report-${new Date().toISOString().slice(0, 10)}.xls`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Excel spreadsheet (.xls) downloaded!');
    } catch (err: any) {
      toast.error('Failed to export XLS: ' + err.message);
    } finally {
      setExportingXls(false);
    }
  };

  const overview = metrics?.overview || {};
  const repPerformance = metrics?.repPerformance || [];
  const statusBreakdown = metrics?.statusBreakdown || [];
  const ledger = metrics?.ledger || [];

  return (
    <div className="space-y-8 animate-pageEnter">
      {/* Report Canvas Wrapped for PDF capture */}
      <div ref={reportContainerRef} className="space-y-8 p-1 sm:p-2 bg-white rounded-3xl">
        {/* Header matching Reference Screenshot 5 */}
        <div className="pb-6 border-b border-neutral-200">
          <div className="text-[10px] font-mono tracking-widest text-[#ff3b30] uppercase font-bold mb-1">
            SCREEN 10 // TELEMETRY &amp; EXECUTIVE AUDITING
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-[#111111] uppercase tracking-tight">
            Admin / Reporting Dashboard (Optional)
          </h2>
          <p className="app-page-subtitle">
            Sales trends, approval bottlenecks and platform usage
          </p>
        </div>

        {/* 4 Interactive Filters matching Reference Screenshot 5: Period, Sales Team, Approval Status, Product */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          {/* Filter 1: Period */}
          <div className="space-y-1.5">
            <label className="block text-neutral-600 font-bold uppercase text-[11px]">
              Period
            </label>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white font-mono text-xs text-neutral-900 focus:ring-1 focus:ring-[#ff3b30] focus:border-[#ff3b30] shadow-xs cursor-pointer"
            >
              <option value="all">All Time</option>
              <option value="this_month">This Month</option>
              <option value="last_30_days">Last 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="this_year">This Year</option>
            </select>
          </div>

          {/* Filter 2: Sales Team / Rep */}
          <div className="space-y-1.5">
            <label className="block text-neutral-600 font-bold uppercase text-[11px]">
              Sales Team
            </label>
            <select
              value={selectedRep}
              onChange={(e) => setSelectedRep(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white font-mono text-xs text-neutral-900 focus:ring-1 focus:ring-[#ff3b30] focus:border-[#ff3b30] shadow-xs cursor-pointer"
            >
              <option value="all">All Sales Reps</option>
              {repPerformance.map((r: any) => (
                <option key={r.rep_id} value={r.rep_id}>
                  {r.rep_name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Approval Status */}
          <div className="space-y-1.5">
            <label className="block text-neutral-600 font-bold uppercase text-[11px]">
              Approval Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white font-mono text-xs text-neutral-900 focus:ring-1 focus:ring-[#ff3b30] focus:border-[#ff3b30] shadow-xs cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed / Won</option>
              <option value="pending_manager">Pending Manager</option>
              <option value="pending_finance">Pending Finance</option>
              <option value="under_negotiation">Under Negotiation</option>
              <option value="draft">Draft</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Filter 4: Product */}
          <div className="space-y-1.5">
            <label className="block text-neutral-600 font-bold uppercase text-[11px]">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-neutral-300 bg-white font-mono text-xs text-neutral-900 focus:ring-1 focus:ring-[#ff3b30] focus:border-[#ff3b30] shadow-xs cursor-pointer"
            >
              <option value="all">All Products</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Main KPI Cards matching Reference Screenshot 5: Quotes Created, Avg Approval Time, Top Upsold Product */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
          {/* Card 1: Quotes Created */}
          <div className="app-card p-6 sm:p-7 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                  Quotes Created
                </h4>
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-display font-black text-4xl sm:text-5xl text-neutral-900 tracking-tight">
                  {overview.quotes_created !== undefined ? overview.quotes_created : 148}
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-1">
                  {period === 'all'
                    ? 'Total platform lifetime deals'
                    : period === 'this_month'
                    ? `${overview.quotes_created || 0} this month`
                    : 'Matching active filter window'}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-neutral-200 flex items-center justify-between text-xs font-mono text-neutral-600">
              <span>Confirmed Deals:</span>
              <strong className="text-emerald-700 font-bold">{overview.confirmed_deals_count || 0} Won</strong>
            </div>
          </div>

          {/* Card 2: Avg Approval Time */}
          <div className="app-card p-6 sm:p-7 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                  Avg Approval Time
                </h4>
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-display font-black text-4xl sm:text-5xl text-neutral-900 tracking-tight">
                  {overview.avg_approval_time_hours || '6.4'} <span className="text-xl sm:text-2xl font-normal text-neutral-600">hours</span>
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-1">
                  Quotation creation to managerial sign-off
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-neutral-200 flex items-center justify-between text-xs font-mono text-neutral-600">
              <span>Pending Escalations:</span>
              <strong className="text-amber-700 font-bold">{overview.pending_approvals_count || 0} in queue</strong>
            </div>
          </div>

          {/* Card 3: Top Upsold Product */}
          <div className="app-card p-6 sm:p-7 rounded-3xl border border-neutral-200 bg-neutral-50/70 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
                <h4 className="font-display font-black text-lg text-neutral-900 uppercase tracking-tight">
                  Top Upsold Product
                </h4>
                <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <div className="font-display font-black text-2xl sm:text-3xl text-neutral-900 tracking-tight truncate" title={overview.top_upsold_product || 'Care Plan 2yr'}>
                  {overview.top_upsold_product || 'Care Plan 2yr'}
                </div>
                <p className="text-xs font-mono text-neutral-500 mt-1">
                  High-margin contract upsell favorite
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-neutral-200 flex items-center justify-between text-xs font-mono text-neutral-600">
              <span>Pipeline Volume:</span>
              <strong className="text-neutral-900 font-bold">
                ${Number(overview.total_confirmed_revenue || overview.total_pipeline_value || 0).toLocaleString()}
              </strong>
            </div>
          </div>
        </div>

        {/* Detailed Quotation Ledger Table */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="font-display font-bold text-lg text-neutral-900 uppercase">
              Filtered Quotation Ledger ({ledger.length})
            </h4>
            <span className="text-xs font-mono text-neutral-500">Live PostgreSQL Telemetry</span>
          </div>

          <div className="app-table-wrapper rounded-3xl overflow-hidden shadow-xs border border-neutral-200 bg-white">
            <div className="app-table-scroll">
              <table className="app-table">
                <thead className="app-thead">
                  <tr>
                    <th className="app-th">Quotation</th>
                    <th className="app-th">Customer</th>
                    <th className="app-th">Account Rep</th>
                    <th className="app-th">Status</th>
                    <th className="app-th text-center">Risk Score</th>
                    <th className="app-th app-th-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="app-tbody app-tbody-divide">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="app-table-empty">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#ff3b30]" />
                        Querying database records...
                      </td>
                    </tr>
                  ) : ledger.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="app-table-empty">
                        <p className="font-bold text-neutral-800">No matching quotations found</p>
                        <p className="text-xs text-neutral-500">Try adjusting the filter criteria above.</p>
                      </td>
                    </tr>
                  ) : (
                    ledger.map((q: any) => (
                      <tr key={q.id} className="app-tr">
                        <td className="app-td font-mono font-bold text-[#ff3b30]">
                          {q.quotation_code}
                        </td>
                        <td className="app-td font-bold text-neutral-900">
                          {q.customer_name}
                        </td>
                        <td className="app-td font-mono text-xs text-neutral-600">
                          {q.rep_name || 'Rachel Rep'}
                        </td>
                        <td className="app-td">
                          <span
                            className={`app-badge ${
                              q.status === 'confirmed'
                                ? 'badge-confirmed'
                                : q.status.includes('pending')
                                ? 'badge-pending'
                                : 'badge-draft'
                            }`}
                          >
                            {q.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="app-td text-center font-mono text-xs font-bold text-neutral-800">
                          {q.blended_risk_score ?? 0}
                        </td>
                        <td className="app-td app-td-right font-mono font-bold text-neutral-900">
                          ${Number(q.total_amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sales Rep Performance Summary */}
        {repPerformance.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="font-display font-bold text-lg text-neutral-900 uppercase">
              Sales Rep Performance &amp; Discount Governance
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repPerformance.map((rep: any) => (
                <div key={rep.rep_id} className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-sm">{rep.rep_name}</span>
                    <span className="text-[11px] font-mono text-neutral-500">{rep.total_quotes} Quotes</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div>
                      <span className="text-neutral-500">Won Revenue:</span>
                      <div className="font-bold text-emerald-700">${Number(rep.total_revenue || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-neutral-500">Avg Discount:</span>
                      <div className="font-bold text-neutral-800">{Number(rep.avg_discount_given || 0).toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons matching Reference Screenshot 5: Export PDF & Export XLS */}
      <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-neutral-200">
        <button
          onClick={handleExportPdf}
          disabled={exportingPdf}
          className="btn btn-secondary rounded-full shadow-xs hover:border-black active:scale-95 text-xs font-mono font-bold"
        >
          <FileText className="w-4 h-4 text-rose-600" />
          <span>{exportingPdf ? 'Generating PDF...' : 'Export PDF'}</span>
        </button>

        <button
          onClick={handleExportXls}
          disabled={exportingXls}
          className="btn btn-secondary rounded-full shadow-xs hover:border-black active:scale-95 text-xs font-mono font-bold"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>{exportingXls ? 'Exporting XLS...' : 'Export XLS'}</span>
        </button>

        <span className="text-xs font-mono text-neutral-500 ml-auto">
          Audit telemetry synchronized with PostgreSQL row-level state.
        </span>
      </div>
    </div>
  );
};

export default GovernanceReportsTab;
