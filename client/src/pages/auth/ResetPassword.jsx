import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import AuthForm from '../../components/auth/AuthForm';
import { useToast } from '../../context/ToastContext';

const ResetPassword = () => {
  const [error, setError] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const emailProp = location.state?.email || '';

  const handleSubmit = async (data) => {
    try {
      setError(null);
      
      if (data.newPassword !== data.confirmPassword) {
        setError("Passwords don't match");
        return;
      }

      await authService.resetPassword({
        email: data.email,
        otp: data.otp,
        newPassword: data.newPassword
      });

      showToast('Password reset successful. You can now log in.', 'success');
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    }
  };

  return (
    <div className="py-20 px-4 min-h-[80vh] flex items-center">
      <AuthForm
        title="Enter OTP"
        error={error}
        fields={[
          { name: 'email', label: 'Email', type: 'email', placeholder: 'your@email.com' }, // Let them enter email in case they lost state
          { name: 'otp', label: '6-digit OTP', placeholder: '123456' },
          { name: 'newPassword', label: 'New Password', type: 'password', placeholder: '••••••••' },
          { name: 'confirmPassword', label: 'Confirm New Password', type: 'password', placeholder: '••••••••' }
        ]}
        onSubmit={async (data) => {
           // We override the initial empty state if we passed email in state, but the form handles its own state
           // Since we don't have controlled values based on props in AuthForm easily without refactoring, 
           // we just let them type it, or ideally we'd pass initialValues. Let's keep it simple.
           await handleSubmit(data);
        }}
        submitText="Reset Password"
        footer={
          <Link to="/login" className="text-zinc-400 hover:text-white transition-colors">
            Back to Login
          </Link>
        }
      />
    </div>
  );
};

export default ResetPassword;
