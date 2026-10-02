import { useState, useRef } from 'react';
import adminService from '../../services/admin.service';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const AdminScanner = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [day, setDay] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await adminService.verifyTicket(tokenInput.trim(), day);
      setResult(res);
      setTokenInput('');
      inputRef.current?.focus();
    } catch (err) {
      setResult({
        success: false,
        valid: false,
        reason: err.response?.data?.message || 'Server error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">QR Scanner & Check-in</h1>

      <div className="bg-zinc-900 rounded-xl p-6 border border-zinc-800 mb-8">
        <form onSubmit={handleScan}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Event Day</label>
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
              >
                {[...Array(9)].map((_, i) => (
                  <option key={i+1} value={i+1}>Day {i+1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">QR Token Input (from Scanner)</label>
              <input
                ref={inputRef}
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Scan or type token..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-white focus:outline-none focus:border-red-500"
                autoFocus
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || !tokenInput}
            className="w-full btn-primary py-3"
          >
            {loading ? 'Verifying...' : 'Verify Ticket'}
          </button>
        </form>
      </div>

      {result && (
        <div className={`rounded-xl p-8 border ${
          result.valid ? 'bg-green-900/20 border-green-500/30' : 
          result.reason.includes('ALREADY') ? 'bg-orange-900/20 border-orange-500/30' :
          'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="text-center">
            {result.valid ? (
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            ) : result.reason.includes('ALREADY') ? (
              <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            ) : (
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            )}
            
            <h2 className={`text-2xl font-bold mb-2 ${
              result.valid ? 'text-green-500' : 
              result.reason.includes('ALREADY') ? 'text-orange-500' : 
              'text-red-500'
            }`}>
              {result.valid ? 'VALID PASS' : 
               result.reason.includes('ALREADY') ? 'ALREADY USED' : 
               'INVALID PASS'}
            </h2>
            
            <p className="text-xl mb-6 text-zinc-300">{result.reason}</p>

            {result.ticket && (
              <div className="bg-zinc-950 rounded-lg p-4 text-left inline-block w-full max-w-sm mx-auto">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ticket ID</span>
                    <span className="font-mono">{result.ticket.ticketId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Holder</span>
                    <span className="font-bold">{result.ticket.holderName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Pass Type</span>
                    <span>{result.ticket.passName}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminScanner;
