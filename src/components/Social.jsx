import { useState, useEffect } from 'react';
import { Trophy, Skull, RefreshCw, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Social({ user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [boss, setBoss] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
    fetchBoss();

    // Set up realtime subscription for Boss HP
    const bossSubscription = supabase
      .channel('world_boss_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'world_boss' }, payload => {
        if (payload.new) {
          setBoss(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(bossSubscription);
    };
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, level, exp, title, border')
        .order('level', { ascending: false })
        .order('exp', { ascending: false })
        .limit(15);

      if (error) throw error;
      if (data) setLeaderboard(data);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBoss = async () => {
    try {
      const { data, error } = await supabase
        .from('world_boss')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (data) setBoss(data);
    } catch (err) {
      console.error('Error fetching boss:', err);
    }
  };

  const getRankColor = (index) => {
    switch(index) {
      case 0: return 'text-yellow-400 font-extrabold';
      case 1: return 'text-gray-300 font-bold';
      case 2: return 'text-amber-600 font-bold';
      default: return 'text-gameText/80';
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden gap-6">
      
      {/* World Boss Section */}
      <div className="shrink-0 game-card border-red-500/80 shadow-[0_0_20px_rgba(239,68,68,0.25)] bg-gradient-to-r from-red-950/30 via-gameCard to-red-950/30">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-rpg text-red-400 flex items-center gap-2 text-sm sm:text-base">
            <Skull className="text-red-500 animate-pulse" /> Boss Thế Giới
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded bg-red-900/50 text-red-300 border border-red-500/50">
            Realtime Sync
          </span>
        </div>

        {boss ? (
          <div className="text-center">
            <h4 className="text-xl font-bold mb-2 text-red-400 font-rpg tracking-wide">{boss.name}</h4>
            <div className="w-full bg-gray-950 rounded-full h-6 border-2 border-red-900 relative overflow-hidden mb-3 shadow-inner">
              <div 
                className="bg-gradient-to-r from-red-700 to-red-500 h-full transition-all duration-500"
                style={{ width: `${Math.max(0, (boss.hp / boss.max_hp) * 100)}%` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-bold font-rpg text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                {boss.hp} / {boss.max_hp} HP
              </div>
            </div>
            <p className="text-xs text-gameText/70">
              ⚔️ Mỗi Task bạn hoàn thành sẽ trừ 10 HP của Boss! Toàn server đang cùng nhau chiến đấu!
            </p>
          </div>
        ) : (
          <div className="text-center py-4 opacity-70 flex justify-center items-center gap-2 text-xs">
            <RefreshCw size={14} className="animate-spin text-red-400" />
            <span>Đang định vị Boss Thế Giới...</span>
          </div>
        )}
      </div>

      {/* Leaderboard Section */}
      <div className="flex-grow flex flex-col min-h-0">
        <div className="flex justify-between items-center mb-3 shrink-0">
          <h3 className="font-rpg text-gamePrimary flex items-center gap-2 text-sm sm:text-base">
            <Trophy className="text-yellow-400" /> Bảng Xếp Hạng Hiệp Sĩ
          </h3>
          <button 
            onClick={() => { setLoading(true); fetchLeaderboard(); }} 
            className="p-1 text-gray-400 hover:text-white rounded"
            title="Làm mới bảng xếp hạng"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        
        <div className="overflow-y-auto pr-2 custom-scrollbar">
          {loading && leaderboard.length === 0 ? (
            <div className="text-center py-8 opacity-50 text-xs">Đang tải danh sách anh hùng...</div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 game-card border-dashed">
              <p className="text-gameText opacity-50 text-sm">Chưa có dữ liệu anh hùng trên server.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {leaderboard.map((p, index) => {
                const isCurrentUser = p.id === user?.id || p.username === user?.name;
                return (
                  <div 
                    key={p.id || p.username} 
                    className={`flex items-center gap-3 p-3 rounded-lg bg-gameSecondary/80 border transition-all ${
                      isCurrentUser 
                        ? 'border-gamePrimary bg-gamePrimary/10 shadow-[0_0_15px_rgba(233,69,96,0.25)]' 
                        : 'border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className={`font-rpg text-lg w-7 text-center shrink-0 ${getRankColor(index)}`}>
                      #{index + 1}
                    </div>
                    
                    <div className={`w-10 h-10 shrink-0 bg-gray-900 rounded-full flex items-center justify-center border-2 ${p.border || 'border-gray-600'}`}>
                      <span className="font-bold text-sm text-gamePrimary">
                        {p.username ? p.username.charAt(0).toUpperCase() : '?'}
                      </span>
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-bold text-sm truncate ${isCurrentUser ? 'text-gamePrimary' : 'text-gameText'}`}>
                          {p.username || 'Ẩn danh'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-gamePrimary/30 text-pink-300 font-semibold">
                            Bạn
                          </span>
                        )}
                        {p.title && (
                          <span className="text-[10px] text-yellow-400/90 font-medium">
                            &lt;{p.title}&gt;
                          </span>
                        )}
                      </div>
                      <div className="text-xs opacity-70 mt-0.5 flex items-center gap-2">
                        <span>Cấp {p.level || 1}</span>
                        <span>&bull;</span>
                        <span>{p.exp || 0} EXP</span>
                      </div>
                    </div>

                    {index < 3 && (
                      <div className="shrink-0">
                        <Shield size={18} className={index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
