import { useState, useEffect } from 'react';
import { Users, Trophy, Skull } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Social({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [boss, setBoss] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
    fetchBoss();

    // Set up realtime subscription for Boss HP
    const bossSubscription = supabase
      .channel('world_boss_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'world_boss' }, payload => {
        setBoss(payload.new);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bossSubscription);
    };
  }, []);

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('username, level, exp, title, border')
      .order('level', { ascending: false })
      .order('exp', { ascending: false })
      .limit(10);
    if (data) setLeaderboard(data);
  };

  const fetchBoss = async () => {
    const { data } = await supabase
      .from('world_boss')
      .select('*')
      .limit(1)
      .single();
    if (data) setBoss(data);
  };

  const getRankColor = (index) => {
    switch(index) {
      case 0: return 'text-yellow-400';
      case 1: return 'text-gray-300';
      case 2: return 'text-amber-600';
      default: return 'text-gameText';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-6">
      
      {/* World Boss Section */}
      <div className="shrink-0 game-card border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <h3 className="font-rpg text-red-500 mb-4 flex items-center gap-2">
          <Skull /> Boss Thế Giới
        </h3>
        {boss ? (
          <div className="text-center">
            <h4 className="text-xl font-bold mb-2 text-red-400">{boss.name}</h4>
            <div className="w-full bg-gray-900 rounded-full h-6 border-2 border-gray-700 relative overflow-hidden mb-2">
              <div 
                className="bg-red-600 h-full transition-all duration-500"
                style={{ width: `${Math.max(0, (boss.hp / boss.max_hp) * 100)}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-rpg text-white drop-shadow-md">
                {boss.hp} / {boss.max_hp} HP
              </div>
            </div>
            <p className="text-xs opacity-70">
              Mỗi Task bạn hoàn thành sẽ trừ 10 HP của Boss! 
              Cả server đang cùng nhau chiến đấu!
            </p>
          </div>
        ) : (
          <p className="text-center opacity-50">Đang tìm kiếm Boss...</p>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="flex-grow flex flex-col min-h-0">
        <h3 className="font-rpg text-gamePrimary mb-4 flex items-center gap-2 shrink-0">
          <Trophy /> Bảng Xếp Hạng
        </h3>
        
        <div className="overflow-y-auto pr-2 custom-scrollbar">
          {leaderboard.length === 0 ? (
            <p className="text-center opacity-50">Chưa có dữ liệu.</p>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((p, index) => (
                <div key={p.username} className={`flex items-center gap-4 p-3 rounded bg-gameSecondary border ${p.username === user?.name ? 'border-gamePrimary' : 'border-gray-800'}`}>
                  <div className={`font-rpg text-xl w-6 text-center ${getRankColor(index)}`}>
                    #{index + 1}
                  </div>
                  
                  <div className={`w-10 h-10 shrink-0 bg-gray-900 rounded-full flex items-center justify-center border-2 ${p.border || 'border-gray-600'}`}>
                    <span className="font-bold">{p.username.charAt(0).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex-grow min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold truncate">{p.username}</span>
                      {p.title && <span className="text-[9px] text-yellow-500 uppercase tracking-wider hidden sm:inline">&lt;{p.title}&gt;</span>}
                    </div>
                    <div className="text-xs opacity-70">
                      LVL {p.level} • {p.exp} EXP
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
