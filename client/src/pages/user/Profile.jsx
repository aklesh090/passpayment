import { useAuth } from '../../context/AuthContext';
import { User } from 'lucide-react';

const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <div className="mb-10">
        <h1 className="text-3xl font-bold font-heading mb-2">My Profile</h1>
      </div>

      <div className="glass-panel p-8">
        <div className="flex items-center mb-8 pb-8 border-b border-zinc-800">
          <div className="bg-zinc-800 p-4 rounded-full mr-6">
            <User size={48} className="text-zinc-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{user.name}</h2>
            <p className="text-zinc-400">{user.email}</p>
            <p className="text-zinc-400 mt-1">{user.phone}</p>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-4">Account Actions</h3>
          <div className="space-y-4">
            <button className="w-full text-left px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors font-medium">
              Change Password
            </button>
            <button 
              onClick={logout}
              className="w-full text-left px-4 py-3 bg-red-950/30 text-red-500 hover:bg-red-950/50 rounded-lg transition-colors font-medium"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
