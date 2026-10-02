import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, statusFilter, page]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await adminService.getOrders({ search, paymentStatus: statusFilter, page });
      setOrders(res.orders);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Order Management</h1>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {loading && <div className="py-10 text-center">Loading...</div>}

        {!loading && orders.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="p-4 rounded-tl-lg">Order ID</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Items</th>
                  <th className="p-4 rounded-tr-lg">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {orders.map(order => (
                  <tr key={order._id} className="hover:bg-zinc-800/50">
                    <td className="p-4 font-mono text-sm">{order.orderId}</td>
                    <td className="p-4">
                      {order.user ? (
                        <>
                          <div className="font-medium">{order.user.name}</div>
                          <div className="text-xs text-zinc-500">{order.user.email}</div>
                        </>
                      ) : (
                        <span className="text-zinc-500">Deleted User</span>
                      )}
                    </td>
                    <td className="p-4 font-mono">₹{order.totalAmount}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-500' :
                        order.paymentStatus === 'pending' ? 'bg-orange-500/20 text-orange-500' :
                        'bg-red-500/20 text-red-500'
                      }`}>
                        {order.paymentStatus.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {order.items.reduce((acc, item) => acc + item.quantity, 0)} passes
                    </td>
                    <td className="p-4 text-sm text-zinc-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex justify-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="px-4 py-2 text-zinc-400">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-zinc-800 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
