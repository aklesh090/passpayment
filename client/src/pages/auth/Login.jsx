import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/auth/AuthForm';
import { useState } from 'react';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (data) => {
    try {
      setError(null);
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    }
  };

  return (
    <div className="py-20 px-4 min-h-[80vh] flex items-center">
      <AuthForm
        title="Welcome Back"
        error={error}
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
          { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }
        ]}
        onSubmit={handleSubmit}
        submitText="Sign In"
        footer={
          <div className="flex flex-col space-y-3">
            <Link to="/forgot-password" className="text-red-400 hover:text-red-300">
              Forgot your password?
            </Link>
            <p>
              Don't have an account?{' '}
              <Link to="/register" className="text-red-500 hover:text-red-400 font-medium">
                Create one
              </Link>
            </p>
          </div>
        }
      />
    </div>
  );
};

export default Login;
