import { Loader2 } from 'lucide-react';

export const LoadingState = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-20">
    <Loader2 className="h-10 w-10 text-red-500 animate-spin mb-4" />
    <p className="text-zinc-400 font-medium">{message}</p>
  </div>
);

export const EmptyState = ({ title, message, actionText, onAction, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
    {Icon && <div className="bg-zinc-900 p-4 rounded-full mb-4 text-zinc-500"><Icon size={40} /></div>}
    <h3 className="text-2xl font-bold mb-2">{title}</h3>
    <p className="text-zinc-400 max-w-md mx-auto mb-6">{message}</p>
    {actionText && onAction && (
      <button onClick={onAction} className="btn-primary">
        {actionText}
      </button>
    )}
  </div>
);

export const ErrorState = ({ message = 'Something went wrong', onRetry }) => (
  <div className="flex flex-col items-center justify-center py-20 text-center px-4">
    <div className="bg-red-950 p-4 rounded-full mb-4 text-red-500">
      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <h3 className="text-2xl font-bold mb-2">Oops!</h3>
    <p className="text-zinc-400 max-w-md mx-auto mb-6">{message}</p>
    {onRetry && (
      <button onClick={onRetry} className="btn-outline">
        Try Again
      </button>
    )}
  </div>
);
