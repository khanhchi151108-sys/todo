import { useState } from 'react';
import { Ticket, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GACHA_POOL } from '../data/items';
import { supabase } from '../lib/supabase';

export default function Gacha({ user, onClose, onReward }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState(null);

  const drawGacha = async () => {
    setIsSpinning(true);
    
    // Simulate spinning animation
    setTimeout(async () => {
      // Randomly pick a reward type
      const isTitle = Math.random() > 0.5;
      const pool = isTitle ? GACHA_POOL.titles : GACHA_POOL.borders;
      
      // Randomly pick an item from the pool based on basic weight
      // (Simplified: equal chance for MVP)
      const randomIndex = Math.floor(Math.random() * pool.length);
      const wonItem = pool[randomIndex];
      wonItem.type = isTitle ? 'title' : 'border';

      // Save to DB
      const updateData = isTitle ? { title: wonItem.name } : { border: wonItem.class };
      const { data } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('username', user.name)
        .select()
        .single();

      setIsSpinning(false);
      setReward(wonItem);
      
      confetti({
        particleCount: 150,
        spread: 100,
        colors: ['#ff00ff', '#00ffff', '#ffff00']
      });

      if (data) {
        onReward(data);
      }
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="game-card max-w-sm w-full text-center relative border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
        {!isSpinning && !reward && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        )}
        
        {reward ? (
          <div className="animate-fade-in-up py-8">
            <Sparkles size={64} className="mx-auto text-yellow-400 mb-4 animate-spin-slow" />
            <h2 className="text-2xl font-rpg text-yellow-400 mb-2">Chúc mừng!</h2>
            <p className="mb-4">Bạn đã nhận được {reward.type === 'title' ? 'Danh hiệu' : 'Viền Avatar'}:</p>
            <div className={`inline-block p-4 rounded-lg bg-gray-900 border-2 border-gamePrimary mb-6 ${reward.type === 'border' ? reward.class : ''}`}>
              <span className={`font-bold text-xl ${reward.rarity === 'legendary' ? 'text-yellow-400 animate-pulse' : 'text-gamePrimary'}`}>
                {reward.name || 'Viền Hiếm'}
              </span>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Đóng</button>
          </div>
        ) : (
          <div className="py-8">
            <Ticket size={64} className={`mx-auto text-pink-500 mb-6 ${isSpinning ? 'animate-bounce' : ''}`} />
            <h2 className="text-2xl font-rpg text-pink-400 mb-4">Vòng Quay May Mắn</h2>
            {isSpinning ? (
              <p className="text-xl animate-pulse">Đang quay...</p>
            ) : (
              <button onClick={drawGacha} className="btn-primary w-full text-lg py-4 flex justify-center gap-2 items-center">
                <Sparkles size={20} /> QUAY NGAY
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
