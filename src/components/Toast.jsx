import { useEffect } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, Sparkles, X } from 'lucide-react';

export default function Toast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onRemove]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="text-green-400 shrink-0" size={20} />;
      case 'error':
        return <XCircle className="text-red-400 shrink-0" size={20} />;
      case 'warning':
        return <AlertTriangle className="text-amber-400 shrink-0" size={20} />;
      case 'level-up':
        return <Sparkles className="text-yellow-400 shrink-0 animate-bounce" size={20} />;
      default:
        return <Info className="text-blue-400 shrink-0" size={20} />;
    }
  };

  const getBorderColor = () => {
    switch (toast.type) {
      case 'success': return 'border-green-500/50 bg-green-950/80 shadow-[0_0_15px_rgba(34,197,94,0.3)]';
      case 'error': return 'border-red-500/50 bg-red-950/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'warning': return 'border-amber-500/50 bg-amber-950/80 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
      case 'level-up': return 'border-yellow-500 bg-yellow-950/90 shadow-[0_0_20px_rgba(234,179,8,0.5)]';
      default: return 'border-blue-500/50 bg-blue-950/80 shadow-[0_0_15px_rgba(59,130,246,0.3)]';
    }
  };

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border backdrop-blur-md transition-all duration-300 transform translate-y-0 animate-fade-in-up ${getBorderColor()}`}>
      {getIcon()}
      <div className="flex-grow min-w-0 text-sm">
        {toast.title && <div className="font-bold font-rpg text-xs mb-1">{toast.title}</div>}
        <div className="text-gameText/90 leading-snug whitespace-pre-line">{toast.message}</div>
      </div>
      <button 
        onClick={onRemove}
        className="text-gray-400 hover:text-white transition-colors p-0.5 rounded"
      >
        <X size={16} />
      </button>
    </div>
  );
}
