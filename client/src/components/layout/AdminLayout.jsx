import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  BarChart, 
  Users, 
  Ticket, 
  ShoppingBag,
  QrCode,
  FileText
} from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: BarChart },
    { name: 'Users', href: '/admin/users', icon: Users },
    { name: 'Passes', href: '/admin/pass-types', icon: Ticket },
    { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
    { name: 'Tickets', href: '/admin/tickets', icon: Ticket },
    { name: 'Scanner', href: '/admin/scanner', icon: QrCode },
    { name: 'Reports', href: '/admin/reports', icon: FileText },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-zinc-950">
      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50">
        <div className="h-full px-3 py-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href);
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center p-2 rounded-lg group ${
                      isActive 
                        ? 'bg-red-500 text-white' 
                        : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 transition duration-75" />
                    <span className="ml-3">{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto bg-zinc-950 p-6">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
