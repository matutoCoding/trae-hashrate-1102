import { X, Check, AlertCircle } from 'lucide-react';

interface ToastProps {
  toast: { type: 'success' | 'error'; message: string } | null;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  const isSuccess = toast.type === 'success';

  return (
    <div className="fixed top-6 right-6 z-50 animate-slide-in">
      <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl backdrop-blur-md border ${
        isSuccess 
          ? 'bg-green-900/80 text-green-100 border-green-500/30' 
          : 'bg-red-900/80 text-red-100 border-red-500/30'
      }`}>
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
          isSuccess ? 'bg-green-500/20' : 'bg-red-500/20'
        }`}>
          {isSuccess ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-400" />
          )}
        </div>
        <span className="font-medium text-sm">{toast.message}</span>
        <button
          onClick={onClose}
          className={`ml-2 p-1 rounded-lg transition-colors ${
            isSuccess ? 'hover:bg-green-500/20 text-green-300' : 'hover:bg-red-500/20 text-red-300'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
