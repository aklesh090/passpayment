import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import AuthForm from '../../components/auth/AuthForm';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const [error, setError] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (data) => {
    try {
      setError(null);
      await authService.forgotPassword(data.email);
      showToast('If an account exists, an OTP has been sent to your email.', 'success', 5000);
      navigate('/reset-password', { state: { email: data.email } });
    } catch (err) {
      setError(err.message || 'Failed to process request');
    }
  };

  return (
    <div className="py-20 px-4 min-h-[80vh] flex items-center">
      <AuthForm
        title="Reset Password"
        error={error}
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' }
        ]}
        onSubmit={handleSubmit}
        submitText="Send OTP"
        footer={
          <Link to="/login" className="text-zinc-400 hover:text-white transition-colors">
            Back to Login
          </Link>
        }
      />
    </div>
  );
};

export default ForgotPassword;
