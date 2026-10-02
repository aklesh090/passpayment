import { useState, useEffect } from 'react';
import { passService } from '../../services/pass.service';

const AdminPasses = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPasses();
  }, []);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const res = await passService.getAll();
      setPasses(res.data.passes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (pass) => {
    try {
      await passService.update(pass._id, { isActive: !pass.isActive });
      fetchPasses();
    } catch (err) {
      alert('Failed to update pass');
    }
  };

  const handleChangePrice = async (pass) => {
    const newPrice = prompt(`Enter new price for ${pass.name} (Current: ${pass.price})`, pass.price);
    if (!newPrice || isNaN(newPrice) || Number(newPrice) < 0) return;

    try {
      await passService.update(pass._id, { price: Number(newPrice) });
      fetchPasses();
    } catch (err) {
      alert('Failed to update pass price');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pass Management</h1>
        <button className="btn-primary" onClick={() => alert('Full create pass UI can be built here')}>
          + Create Pass
        </button>
      </div>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800">
        {loading ? (
          <div className="py-10 text-center">Loading...</div>
        ) : passes.length === 0 ? (
          <div className="py-10 text-center text-zinc-500">No pass types found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 text-zinc-400">
                <tr>
                  <th className="p-4 rounded-tl-lg">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">Sold / Capacity</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {passes.map(pass => (
                  <tr key={pass._id} className="hover:bg-zinc-800/50">
                    <td className="p-4 font-medium">{pass.name}</td>
                    <td className="p-4 capitalize text-zinc-300">{pass.category}</td>
                    <td className="p-4 font-mono text-green-400">₹{pass.price}</td>
                    <td className="p-4 text-zinc-300">
                      {pass.soldQuantity} / {pass.totalQuantity}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full cursor-pointer select-none ${
                        pass.isActive ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30' : 'bg-red-500/20 text-red-500 hover:bg-red-500/30'
                      }`} onClick={() => handleToggleActive(pass)}>
                        {pass.isActive ? 'ACTIVE (Click to Disable)' : 'DISABLED (Click to Enable)'}
                      </span>
                    </td>
                    <td className="p-4 space-x-2">
                      <button 
                        onClick={() => handleChangePrice(pass)}
                        className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                      >
                        Change Price
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPasses;
