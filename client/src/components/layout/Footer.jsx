import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-900 pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-2xl font-heading font-bold text-red-500 tracking-wider block mb-4">
              RANGILO<span className="text-orange-500">RAAS</span>
            </Link>
            <p className="text-zinc-400 text-sm leading-relaxed mb-4">
              Experience the grandest Navratri celebration. 9 days of non-stop Garba, music, and divine energy.
            </p>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link to="/passes" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Buy Passes</Link></li>
              <li><Link to="/schedule" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Event Schedule</Link></li>
              <li><Link to="/about" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link to="/faq" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">FAQ</Link></li>
              <li><Link to="/terms" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link to="/refunds" className="text-zinc-400 hover:text-red-400 text-sm transition-colors">Refund Policy</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2 text-zinc-400 text-sm">
              <li>support@rangiloraas.com</li>
              <li>+91 98765 43210</li>
              <li className="pt-2">
                123 Garba Ground,<br/>
                Ahmedabad, Gujarat 380001
              </li>
            </ul>
          </div>
          
        </div>
        
        <div className="border-t border-zinc-900 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Rangilo Raas. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            {/* Social Icons Placeholder */}
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">IG</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">FB</a>
            <a href="#" className="text-zinc-500 hover:text-white transition-colors">TW</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
