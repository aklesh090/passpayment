import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthForm from '../../components/auth/AuthForm';
import { useState } from 'react';
import { useToast } from '../../context/ToastContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [error, setError] = useState(null);

  const handleSubmit = async (data) => {
    try {
      setError(null);
      if (data.password !== data.confirmPassword) {
        setError("Passwords don't match");
        return;
      }
      
      const { confirmPassword, ...registerData } = data;
      await register(registerData);
      showToast('Registration successful! Welcome to Rangilo Raas.', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to register');
    }
  };

  return (
    <div className="py-20 px-4">
      <AuthForm
        title="Create Account"
        error={error}
        fields={[
          { name: 'name', label: 'Full Name', placeholder: 'Aklesh Patel' },
          { name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' },
          { name: 'phone', label: 'Phone Number', placeholder: '9876543210' },
          { name: 'password', label: 'Password', type: 'password', placeholder: '••••••••' },
          { name: 'confirmPassword', label: 'Confirm Password', type: 'password', placeholder: '••••••••' }
        ]}
        onSubmit={handleSubmit}
        submitText="Create Account"
        footer={
          <p>
            Already have an account?{' '}
            <Link to="/login" className="text-red-500 hover:text-red-400 font-medium">
              Sign In
            </Link>
          </p>
        }
      />
    </div>
  );
};

export default Register;
