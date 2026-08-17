import { useState, useEffect, useCallback } from 'react';
import { Timer, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PomodoroTimer({ user, onClose, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(true);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  const handleFinish = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ double_xp: true })
        .eq('username', user.name)
        .select()
        .single();
      
      if (error) {
        console.error('Pomodoro double xp update error:', error);
      }
      
      if (onComplete) {
        onComplete(data || { double_xp: true });
      }
    } catch (err) {
      console.error('Pomodoro error:', err);
    }
  }, [user.name, onComplete]);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleFinish();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, handleFinish]);

  const handleConfirmCancel = () => {
    setIsActive(false);
    onClose();
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="game-card max-w-sm w-full text-center relative border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
        {!showConfirmCancel && (
          <button onClick={() => setShowConfirmCancel(true)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        )}
        
        {showConfirmCancel ? (
          <div className="py-6 animate-fade-in">
            <AlertCircle size={48} className="mx-auto text-amber-400 mb-3" />
            <h3 className="font-bold text-lg text-amber-300 mb-2">Bỏ cuộc chế độ Tập Trung?</h3>
            <p className="text-xs text-gameText/70 mb-6">
              Nếu bạn hủy bây giờ, hiệu ứng Thuốc Tập Trung sẽ biến mất và bạn không nhận được X2 XP.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowConfirmCancel(false)} 
                className="flex-1 py-2 rounded bg-gray-700 hover:bg-gray-600 text-xs font-bold text-white"
              >
                Tiếp tục tập trung
              </button>
              <button 
                onClick={handleConfirmCancel} 
                className="flex-1 py-2 rounded bg-red-600 hover:bg-red-700 text-xs font-bold text-white"
              >
                Xác nhận bỏ cuộc
              </button>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <Timer size={48} className="mx-auto text-green-500 mb-3 animate-pulse" />
            <h2 className="text-2xl font-rpg text-green-400 mb-1">Chế độ Tập Trung</h2>
            <p className="text-xs opacity-70 mb-6">Hãy tập trung hoàn thành công việc của bạn!</p>
            
            <div className="text-5xl font-rpg text-white mb-6 tracking-wider font-mono">
              {formatTime(timeLeft)}
            </div>
            
            <button 
              onClick={() => setShowConfirmCancel(true)} 
              className="text-xs text-gray-400 hover:text-red-400 underline transition-colors"
            >
              Hủy phiên tập trung
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
