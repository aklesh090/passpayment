import { useState, useEffect } from 'react';
import adminService from '../../services/admin.service';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search, page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ search, page });
      setUsers(res.users);
      setTotalPages(res.totalPages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-96 bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
          />
        </div>

        {loading && <div className="py-10 text-center">Loading...</div>}

        {!loading && users.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="p-4 rounded-tl-lg">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Phone</th>
                  <th className="p-4">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {users.map(user => (
                  <tr key={user._id} className="hover:bg-zinc-800/50">
                    <td className="p-4 font-medium">{user.name}</td>
                    <td className="p-4 text-zinc-300">{user.email}</td>
                    <td className="p-4 text-zinc-300">{user.phone}</td>
                    <td className="p-4 text-zinc-400 text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
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

export default AdminUsers;
