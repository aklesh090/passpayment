import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import Home from './pages/public/Home';
import Passes from './pages/public/Passes';
import { About, Schedule, FAQ, Contact } from './pages/public/StaticPages';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Protected Pages
import Dashboard from './pages/user/Dashboard';
import MyPasses from './pages/user/MyPasses';
import PassDetail from './pages/user/PassDetail';
import Orders from './pages/user/Orders';
import Profile from './pages/user/Profile';
import Checkout from './pages/user/Checkout';
import OrderSuccess from './pages/user/OrderSuccess';

// Admin Pages
import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminPasses from './pages/admin/AdminPasses';
import AdminOrders from './pages/admin/AdminOrders';
import AdminTickets from './pages/admin/AdminTickets';
import AdminScanner from './pages/admin/AdminScanner';
import AdminReports from './pages/admin/AdminReports';

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-zinc-950 text-slate-50">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/passes" element={<Passes />} />
            <Route path="/about" element={<About />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            
            {/* Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/my-passes" element={<MyPasses />} />
              <Route path="/my-passes/:id" element={<PassDetail />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-success/:orderId" element={<OrderSuccess />} />
            </Route>
            
            {/* Admin Routes */}
            <Route element={<ProtectedRoute adminOnly={true} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/pass-types" element={<AdminPasses />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/tickets" element={<AdminTickets />} />
                <Route path="/admin/scanner" element={<AdminScanner />} />
                <Route path="/admin/reports" element={<AdminReports />} />
              </Route>
            </Route>
            
            {/* Fallback */}
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="text-zinc-400 mb-8">The page you are looking for doesn't exist.</p>
                <a href="/" className="btn-primary">Return Home</a>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
