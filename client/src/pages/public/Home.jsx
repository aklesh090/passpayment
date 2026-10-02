import { Link } from 'react-router-dom';
import { Calendar, MapPin, Music, Star, Ticket } from 'lucide-react';

const Home = () => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-zinc-950">
          {/* Abstract pattern for Garba vibe */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-900/40 via-zinc-950 to-zinc-950"></div>
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 rounded-full blur-3xl mix-blend-screen animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/20 rounded-full blur-3xl mix-blend-screen animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>
        
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold font-heading tracking-tight mb-6 animate-in slide-in-from-bottom-8 duration-700">
            RANGILO<span className="text-red-500">RAAS</span> 2.0
          </h1>
          <p className="text-xl md:text-2xl text-zinc-300 mb-10 max-w-2xl mx-auto animate-in slide-in-from-bottom-8 duration-700 delay-150">
            Experience the grandest 9-night Navratri festival. Non-stop Garba, premium experience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in duration-700 delay-300">
            <Link to="/passes" className="btn-primary px-8 py-4 text-lg w-full sm:w-auto">
              BUY YOUR PASS
            </Link>
            <Link to="/schedule" className="btn-outline px-8 py-4 text-lg w-full sm:w-auto">
              VIEW SCHEDULE
            </Link>
          </div>
        </div>
      </section>

      {/* Highlights Section */}
      <section className="py-20 bg-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Why Rangilo Raas?</h2>
            <p className="text-zinc-400 max-w-2xl mx-auto">The most premium Garba experience in the city.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="inline-flex items-center justify-center p-4 bg-red-500/10 text-red-500 rounded-2xl mb-6">
                <Music size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Top Artists</h3>
              <p className="text-zinc-400">Live performances by renowned artists every single night.</p>
            </div>
            
            <div className="glass-panel p-8 text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 text-orange-500 rounded-2xl mb-6">
                <MapPin size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Premium Venue</h3>
              <p className="text-zinc-400">Massive open ground, fully air-conditioned VIP lounges.</p>
            </div>
            
            <div className="glass-panel p-8 text-center hover:-translate-y-2 transition-transform duration-300">
              <div className="inline-flex items-center justify-center p-4 bg-green-500/10 text-green-500 rounded-2xl mb-6">
                <Star size={32} />
              </div>
              <h3 className="text-xl font-bold mb-3">Safe & Secure</h3>
              <p className="text-zinc-400">High-end security, CCTV surveillance, and dedicated family zones.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Pass Preview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">Popular Passes</h2>
              <p className="text-zinc-400">Grab them before they sell out.</p>
            </div>
            <Link to="/passes" className="hidden sm:inline-flex items-center text-red-500 hover:text-red-400 font-medium">
              View All Passes <Ticket size={18} className="ml-2" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Hardcoded preview for home page to entice users. Real data fetched on /passes */}
            <div className="glass-panel p-6 border-orange-500/50 ring-1 ring-orange-500/20 relative">
              <div className="absolute top-4 right-[-35px] rotate-45 bg-orange-500 text-white text-xs font-bold py-1 px-10 shadow-lg">VIP</div>
              <h3 className="text-xl font-bold font-heading mb-2">VIP Season Pass</h3>
              <p className="text-3xl font-bold text-red-500 mb-2">₹750</p>
              <p className="text-sm text-zinc-400 mb-6">Valid for all 9 Days</p>
              <Link to="/passes" className="w-full btn-primary block text-center">BUY NOW</Link>
            </div>
            
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold font-heading mb-2">GA Season Pass</h3>
              <p className="text-3xl font-bold text-red-500 mb-2">₹550</p>
              <p className="text-sm text-zinc-400 mb-6">Valid for all 9 Days</p>
              <Link to="/passes" className="w-full btn-primary block text-center">BUY NOW</Link>
            </div>
            
            <div className="glass-panel p-6">
              <h3 className="text-xl font-bold font-heading mb-2">Daily Pass</h3>
              <p className="text-3xl font-bold text-red-500 mb-2">₹100</p>
              <p className="text-sm text-zinc-400 mb-6">Valid for 1 Day</p>
              <Link to="/passes" className="w-full btn-outline block text-center">VIEW DAYS</Link>
            </div>
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/passes" className="inline-flex items-center text-red-500 hover:text-red-400 font-medium">
              View All Passes <Ticket size={18} className="ml-2" />
            </Link>
          </div>
        </div>
      </section>
      
      {/* Schedule Banner */}
      <section className="py-24 bg-red-900/20 border-y border-red-900/30">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Calendar size={48} className="mx-auto text-red-500 mb-6" />
          <h2 className="text-3xl md:text-5xl font-bold font-heading mb-6">9 Days of Celebration</h2>
          <p className="text-xl text-zinc-300 mb-8">Join us every evening for the most vibrant Navratri.</p>
          <Link to="/schedule" className="btn-primary px-8 py-3">View Full Schedule</Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
