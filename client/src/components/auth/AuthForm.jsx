import { useState } from 'react';

const AuthForm = ({ title, fields, onSubmit, submitText, footer, error: formError }) => {
  const [formData, setFormData] = useState(
    fields.reduce((acc, field) => ({ ...acc, [field.name]: '' }), {})
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass-panel p-8">
        <h2 className="text-3xl font-bold mb-6 text-center">{title}</h2>
        
        {formError && (
          <div className="bg-red-500/20 border border-red-500 text-red-100 p-3 rounded-lg mb-6 text-sm">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field) => (
            <div key={field.name}>
              <label htmlFor={field.name} className="block text-sm font-medium text-zinc-300 mb-1">
                {field.label}
              </label>
              <input
                id={field.name}
                type={field.type || 'text'}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required={field.required !== false}
                className="input-field"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <button 
            type="submit" 
            disabled={isSubmitting}
            className="btn-primary w-full mt-4"
          >
            {isSubmitting ? (
              <span className="flex items-center space-x-2">
                <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                <span>Processing...</span>
              </span>
            ) : submitText}
          </button>
        </form>

        {footer && (
          <div className="mt-6 text-center text-sm text-zinc-400">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
