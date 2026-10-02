import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const dbData = await adminService.getDashboard();
      setData(dbData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data) return;
    
    // Create CSV content from pass sales
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Pass Name,Quantity Sold,Revenue\n";
    
    data.charts.salesByPassType.forEach(item => {
      csvContent += `"${item.name}",${item.count},${item.revenue}\n`;
    });

    // Add summary row
    csvContent += `\n"TOTAL",${data.totalTickets},${data.totalRevenue}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sales_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="text-center py-10">Loading Reports...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Reports</h1>
        <button className="btn-primary" onClick={handleExportCSV}>
          Export Sales CSV
        </button>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 max-w-4xl">
        <h2 className="text-xl font-bold mb-6">Sales Summary</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-zinc-950 text-zinc-400">
              <tr>
                <th className="p-4 rounded-tl-lg">Pass Name</th>
                <th className="p-4 text-right">Quantity Sold</th>
                <th className="p-4 text-right rounded-tr-lg">Revenue (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.charts.salesByPassType.map((item, i) => (
                <tr key={i} className="hover:bg-zinc-800/50">
                  <td className="p-4">{item.name}</td>
                  <td className="p-4 text-right font-mono text-zinc-300">{item.count}</td>
                  <td className="p-4 text-right font-mono text-green-400">{item.revenue.toLocaleString()}</td>
                </tr>
              ))}
              <tr className="bg-zinc-950 font-bold">
                <td className="p-4">TOTAL</td>
                <td className="p-4 text-right font-mono">{data.totalTickets}</td>
                <td className="p-4 text-right font-mono text-green-500">₹{data.totalRevenue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
