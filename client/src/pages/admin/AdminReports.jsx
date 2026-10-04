/**
 * AdminReports.jsx — Rangilo Raas 2.0
 *
 * Admin Sales Reports page.
 *
 * Fixes:
 *  1. Export CSV now calls the server-side endpoint (GET /api/admin/reports/csv)
 *     instead of building a client-side data: URI, which fails on iOS Safari.
 *  2. Uses fetch → Blob → URL.createObjectURL for cross-browser compatibility.
 *  3. Shows a clear fallback message on iOS when the file opens in a new tab.
 *  4. Error messages are user-friendly; no stack traces are shown.
 */

import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';
import { Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [exporting, setExporting] = useState(false);
  const [exportFeedback, setExportFeedback] = useState(null); // { type: 'success'|'info'|'error', message }

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const dbData = await adminService.getDashboard();
      setData(dbData);
    } catch (err) {
      console.error('[AdminReports] dashboard fetch error:', err);
      setFetchError('Failed to load sales data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    setExportFeedback(null);
    try {
      const result = await adminService.downloadSalesReportCSV();
      if (result?.opened) {
        // iOS Safari: file opened in new tab, user can save from there
        setExportFeedback({
          type: 'info',
          message: 'Report opened in a new tab. Use Share → Save to Files to save it.',
        });
      } else {
        setExportFeedback({ type: 'success', message: 'Sales report downloaded successfully.' });
        setTimeout(() => setExportFeedback(null), 4000);
      }
    } catch (err) {
      console.error('[AdminReports] CSV export error:', err);
      setExportFeedback({
        type: 'error',
        message: err.message || 'Unable to download the report. Please try again.',
      });
    } finally {
      setExporting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading / Error states
  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-400">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-red-500 rounded-full animate-spin mr-3" />
        Loading Reports...
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="w-10 h-10 text-red-500" />
        <p className="text-red-400 text-sm">{fetchError}</p>
        <button
          onClick={fetchDashboard}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const salesByPassType = data?.charts?.salesByPassType || [];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-zinc-500 text-sm mt-1">Rangilo Raas 2026 — Sales Summary</p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-medium transition-colors text-sm"
        >
          {exporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export Sales CSV
            </>
          )}
        </button>
      </div>

      {/* Export feedback */}
      {exportFeedback && (
        <div className={`flex items-start gap-3 mb-6 px-4 py-3 rounded-xl border text-sm ${
          exportFeedback.type === 'success' ? 'bg-green-900/20 border-green-500/30 text-green-300' :
          exportFeedback.type === 'info'    ? 'bg-sky-900/20 border-sky-500/30 text-sky-300' :
                                              'bg-red-900/20 border-red-500/30 text-red-300'
        }`}>
          {exportFeedback.type === 'success'
            ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
          {exportFeedback.message}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Revenue', value: `₹${(data?.totalRevenue || 0).toLocaleString()}`, color: 'text-green-400' },
          { label: 'Tickets Sold',  value: data?.totalTickets || 0,  color: 'text-sky-400' },
          { label: 'Paid Orders',   value: data?.paidOrders || 0,    color: 'text-emerald-400' },
          { label: 'Total Users',   value: data?.totalUsers || 0,    color: 'text-purple-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <p className="text-xs text-zinc-500 mb-1">{label}</p>
            <p className={`text-xl font-bold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Sales table */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 max-w-4xl">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-800">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-base font-bold">Sales by Pass Type</h2>
        </div>

        <div className="overflow-x-auto">
          {salesByPassType.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 text-sm">No sales data yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950 text-zinc-400 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-6 py-3 rounded-tl-xl">Pass Name</th>
                  <th className="px-6 py-3 text-right">Quantity Sold</th>
                  <th className="px-6 py-3 text-right rounded-tr-xl">Revenue (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {salesByPassType.map((item, i) => (
                  <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-3 font-medium text-white">{item.name}</td>
                    <td className="px-6 py-3 text-right font-mono text-zinc-300">{item.count}</td>
                    <td className="px-6 py-3 text-right font-mono font-bold text-green-400">
                      {(item.revenue || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-zinc-950 font-bold">
                  <td className="px-6 py-3 rounded-bl-xl">TOTAL</td>
                  <td className="px-6 py-3 text-right font-mono">{data?.totalTickets || 0}</td>
                  <td className="px-6 py-3 text-right font-mono text-green-500 rounded-br-xl">
                    ₹{(data?.totalRevenue || 0).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Note */}
      <p className="text-xs text-zinc-600 mt-4">
        Revenue figures are based on paid orders only. Pending and failed orders are excluded.
      </p>
    </div>
  );
};

export default AdminReports;
