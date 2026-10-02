import { useState, useEffect } from 'react';
import { passService } from '../../services/pass.service';
import PassCard from '../../components/ui/PassCard';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui/States';
import { Ticket } from 'lucide-react';

const Passes = () => {
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await passService.getAll();
      setPasses(res.passes);
    } catch (err) {
      setError(err.message || 'Failed to load passes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  if (loading) return <LoadingState message="Loading available passes..." />;
  if (error) return <ErrorState message={error} onRetry={fetchPasses} />;
  
  const seasonPasses = passes.filter(p => p.category === 'season');
  const dailyPasses = passes.filter(p => p.category === 'daily').sort((a, b) => a.applicableDays[0] - b.applicableDays[0]);

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-bold font-heading mb-4">Get Your Passes</h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
          Secure your entry to Rangilo Raas 2.0. Choose between our value-packed Season passes or individual Daily passes.
        </p>
      </div>

      {passes.length === 0 ? (
        <EmptyState 
          icon={Ticket}
          title="No passes available" 
          message="We are currently sold out or passes haven't been released yet."
        />
      ) : (
        <>
          {seasonPasses.length > 0 && (
            <div className="mb-20">
              <h2 className="text-2xl font-bold font-heading mb-8 flex items-center">
                <span className="bg-red-500 w-2 h-8 mr-3 rounded-full"></span>
                Season Passes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
                {seasonPasses.map(pass => (
                  <PassCard key={pass._id} pass={pass} />
                ))}
              </div>
            </div>
          )}

          {dailyPasses.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold font-heading mb-8 flex items-center">
                <span className="bg-orange-500 w-2 h-8 mr-3 rounded-full"></span>
                Daily Passes
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {dailyPasses.map(pass => (
                  <PassCard key={pass._id} pass={pass} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Passes;
