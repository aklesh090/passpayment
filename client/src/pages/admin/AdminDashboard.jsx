import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';
import { 
  IndianRupee, 
  ShoppingCart, 
  Ticket, 
  Users
} from 'lucide-react';

const AdminDashboard = () => {
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

  if (loading) return <div className="text-center py-10">Loading Dashboard...</div>;
  if (!data) return <div className="text-center text-red-500 py-10">Error loading dashboard</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Overview</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Revenue" value={`₹${data.totalRevenue.toLocaleString()}`} icon={IndianRupee} color="text-green-500" />
        <StatCard title="Total Orders" value={data.totalOrders} icon={ShoppingCart} color="text-blue-500" />
        <StatCard title="Total Tickets" value={data.totalTickets} icon={Ticket} color="text-purple-500" />
        <StatCard title="Total Users" value={data.totalUsers} icon={Users} color="text-orange-500" />
      </div>

      {/* Order Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Paid Orders</h3>
          <p className="text-2xl font-bold text-green-400">{data.paidOrders}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Failed Orders</h3>
          <p className="text-2xl font-bold text-red-400">{data.failedOrders}</p>
        </div>
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h3 className="text-zinc-400 text-sm font-medium mb-2">Cancelled/Refunded</h3>
          <p className="text-2xl font-bold text-orange-400">{data.cancelledOrders}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Pass Breakdown */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Sales by Category</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span>VIP Season</span>
              <span className="font-bold text-lg">{data.vipSales}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800">
              <span>GA Season</span>
              <span className="font-bold text-lg">{data.gaSales}</span>
            </div>
            <div className="flex justify-between items-center pb-4">
              <span>Daily Passes</span>
              <span className="font-bold text-lg">{data.dayPassSales}</span>
            </div>
          </div>
        </div>

        {/* Charts/Metrics Dummy Space (We can add real charts if we add a charting library, else basic bars) */}
        <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
          <h2 className="text-xl font-bold mb-4">Revenue over Time</h2>
          <div className="space-y-3">
            {data.charts.revenueOverTime.length === 0 ? (
              <p className="text-zinc-500">No revenue data yet</p>
            ) : (
              data.charts.revenueOverTime.slice(-5).map(r => (
                <div key={r.date} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">{r.date}</span>
                  <span className="font-mono">₹{r.revenue.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
          
          <h2 className="text-xl font-bold mb-4 mt-8">Ticket Usage</h2>
          <div className="space-y-3">
            {data.charts.ticketUsage.length === 0 ? (
              <p className="text-zinc-500">No check-ins yet</p>
            ) : (
              data.charts.ticketUsage.map(t => (
                <div key={t.day} className="flex justify-between items-center text-sm">
                  <span className="text-zinc-400">{t.day}</span>
                  <span className="font-mono">{t.count} checked in</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 flex items-center">
    <div className={`p-4 rounded-full bg-zinc-950 ${color} mr-4`}>
      <Icon className="w-8 h-8" />
    </div>
    <div>
      <h3 className="text-zinc-400 text-sm font-medium">{title}</h3>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  </div>
);

export default AdminDashboard;
