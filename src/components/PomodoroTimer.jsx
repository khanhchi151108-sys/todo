import { useState, useEffect } from 'react';
import { Timer, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PomodoroTimer({ user, onClose, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(time => time - 1);
      }, 1000);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      handleComplete();
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    // Enable double XP
    const { data } = await supabase
      .from('profiles')
      .update({ double_xp: true })
      .eq('username', user.name)
      .select()
      .single();
    
    if (data) {
      onComplete(data);
      alert('Tập trung thành công! XP của Nhiệm vụ tiếp theo sẽ được X2!');
    }
  };

  const handleCancel = () => {
    if (window.confirm('Nếu bạn hủy bây giờ, Thuốc Tập Trung sẽ bị lãng phí. Bạn có chắc không?')) {
      setIsActive(false);
      onClose();
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="game-card max-w-sm w-full text-center relative border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
        <button onClick={handleCancel} className="absolute top-4 right-4 text-gray-400 hover:text-white">
          <X size={24} />
        </button>
        
        <Timer size={48} className="mx-auto text-green-500 mb-4 animate-pulse" />
        <h2 className="text-2xl font-rpg text-green-400 mb-2">Chế độ Tập Trung</h2>
        <p className="text-sm opacity-70 mb-6">Đừng rời khỏi ứng dụng! Hãy hoàn thành công việc của bạn.</p>
        
        <div className="text-5xl font-rpg text-white mb-8 tracking-wider">
          {formatTime(timeLeft)}
        </div>
        
        <button onClick={handleCancel} className="text-sm text-gray-400 hover:text-red-400 underline">
          Bỏ cuộc (Mất vật phẩm)
        </button>
      </div>
    </div>
  );
}
