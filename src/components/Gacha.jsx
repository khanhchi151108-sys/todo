import { useState } from 'react';
import { Ticket, X, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { GACHA_POOL } from '../data/items';
import { supabase } from '../lib/supabase';

// M2 fix: Weighted rarity system — rarer items have lower drop rates
const RARITY_WEIGHTS = {
  common: 40,     // 40%
  uncommon: 30,   // 30%
  rare: 18,       // 18%
  epic: 9,        // 9%
  legendary: 3    // 3%
};

function weightedRandom(pool) {
  const totalWeight = pool.reduce((sum, item) => sum + (RARITY_WEIGHTS[item.rarity] || 10), 0);
  let roll = Math.random() * totalWeight;
  for (const item of pool) {
    roll -= (RARITY_WEIGHTS[item.rarity] || 10);
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

const RARITY_COLORS = {
  common: 'text-gray-300',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-yellow-400 animate-pulse'
};

export default function Gacha({ user, onClose, onReward }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [reward, setReward] = useState(null);

  const drawGacha = async () => {
    setIsSpinning(true);
    
    setTimeout(async () => {
      const isTitle = Math.random() > 0.5;
      const pool = isTitle ? GACHA_POOL.titles : GACHA_POOL.borders;
      
      // M2: Use weighted random instead of uniform random
      const wonItem = { ...weightedRandom(pool), type: isTitle ? 'title' : 'border' };

      const updateData = isTitle ? { title: wonItem.name } : { border: wonItem.class };
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('username', user.name)
        .select()
        .single();

      if (error) {
        console.error('Gacha DB save error:', error);
      }

      setIsSpinning(false);
      setReward(wonItem);
      
      const confettiCount = wonItem.rarity === 'legendary' ? 300 : wonItem.rarity === 'epic' ? 200 : 100;
      confetti({
        particleCount: confettiCount,
        spread: 100,
        colors: wonItem.rarity === 'legendary' 
          ? ['#ffd700', '#ffaa00', '#ff6600'] 
          : ['#ff00ff', '#00ffff', '#ffff00']
      });

      if (data && onReward) {
        onReward(data);
      } else if (onReward) {
        onReward(updateData);
      }
    }, 2000);
  };

  const rarityLabel = {
    common: 'Phổ thông',
    uncommon: 'Không phổ biến',
    rare: 'Hiếm',
    epic: 'Sử thi',
    legendary: 'Huyền thoại'
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="game-card max-w-sm w-full text-center relative border-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.3)]">
        {!isSpinning && (
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        )}
        
        {reward ? (
          <div className="animate-fade-in-up py-8">
            <Sparkles size={64} className="mx-auto text-yellow-400 mb-4 animate-spin-slow" />
            <h2 className="text-2xl font-rpg text-yellow-400 mb-2">Chúc mừng!</h2>
            <p className="mb-1 text-sm">Bạn đã nhận được {reward.type === 'title' ? 'Danh hiệu' : 'Viền Avatar'}:</p>
            <p className={`text-xs mb-3 font-bold ${RARITY_COLORS[reward.rarity] || 'text-gray-400'}`}>
              ★ {rarityLabel[reward.rarity] || reward.rarity}
            </p>
            <div className={`inline-block p-4 rounded-lg bg-gray-900 border-2 border-gamePrimary mb-6 ${reward.type === 'border' ? reward.class : ''}`}>
              <span className={`font-bold text-lg ${RARITY_COLORS[reward.rarity] || 'text-gamePrimary'}`}>
                {reward.name || 'Viền Hiếm'}
              </span>
            </div>
            <button onClick={onClose} className="btn-primary w-full">Nhận Thưởng</button>
          </div>
        ) : (
          <div className="py-8">
            <Ticket size={64} className={`mx-auto text-pink-500 mb-6 ${isSpinning ? 'animate-bounce' : ''}`} />
            <h2 className="text-2xl font-rpg text-pink-400 mb-4">Vòng Quay May Mắn</h2>
            {isSpinning ? (
              <p className="text-lg animate-pulse text-pink-300">Đang quay phần thưởng...</p>
            ) : (
              <button onClick={drawGacha} className="btn-primary w-full text-base py-3.5 flex justify-center gap-2 items-center">
                <Sparkles size={20} /> QUAY NGAY
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
