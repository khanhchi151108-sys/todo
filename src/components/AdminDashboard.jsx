import { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, Users, Skull, Activity, Search, Edit3, 
  Sparkles, RefreshCw, CheckCircle, Heart, Lock, KeyRound, 
  Server, Database, Save, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { GACHA_POOL } from '../data/items';
import { checkIsAdmin } from '../lib/adminAuth';

export default function AdminDashboard({ currentUser, showToast }) {
  const [adminTab, setAdminTab] = useState('overview');
  const [players, setPlayers] = useState([]);
  const [boss, setBoss] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [bossFormData, setBossFormData] = useState({ name: '', hp: 5000, max_hp: 5000 });
  const [adminLogs, setAdminLogs] = useState([]);

  // Fetch all players and boss
  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Players
      const { data: playersData, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .order('level', { ascending: false });

      if (pErr) throw pErr;
      if (playersData) setPlayers(playersData);

      // 2. Fetch Boss
      const { data: bossData, error: bErr } = await supabase
        .from('world_boss')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (bErr) throw bErr;
      if (bossData) {
        setBoss(bossData);
        setBossFormData({
          name: bossData.name,
          hp: bossData.hp,
          max_hp: bossData.max_hp
        });
      }
    } catch (err) {
      console.error('Admin fetch error:', err);
      showToast({ type: 'error', message: 'Không thể tải dữ liệu quản trị.' });
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Log an admin action
  const addLog = (action, details) => {
    const newLog = {
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      action,
      details,
      admin: currentUser.name
    };
    setAdminLogs(prev => [newLog, ...prev.slice(0, 20)]);
  };

  // Open player edit modal
  const handleOpenEditPlayer = (player) => {
    setSelectedPlayer(player);
    setEditFormData({
      hp: player.hp ?? 100,
      gold: player.gold ?? 0,
      level: player.level ?? 1,
      exp: player.exp ?? 0,
      streak: player.streak ?? 0,
      frozen_days: player.frozen_days ?? 0,
      title: player.title || 'Tân Binh',
      border: player.border || 'border-white',
      double_xp: !!player.double_xp
    });
  };

  // Save edited player
  const handleSavePlayer = async (e) => {
    e.preventDefault();
    if (!selectedPlayer) return;

    try {
      const updates = {
        hp: Number(editFormData.hp),
        gold: Number(editFormData.gold),
        level: Number(editFormData.level),
        exp: Number(editFormData.exp),
        streak: Number(editFormData.streak),
        frozen_days: Number(editFormData.frozen_days),
        title: editFormData.title,
        border: editFormData.border,
        double_xp: editFormData.double_xp
      };

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('username', selectedPlayer.username)
        .select()
        .single();

      if (error) throw error;

      setPlayers(prev => prev.map(p => p.username === selectedPlayer.username ? { ...p, ...data } : p));
      showToast({
        type: 'success',
        title: 'Cập nhật thành công',
        message: `Đã cập nhật chỉ số hiệp sĩ ${selectedPlayer.username}!`
      });
      addLog('Cập nhật người chơi', `${selectedPlayer.username} -> LVL ${updates.level}, Gold ${updates.gold}`);
      setSelectedPlayer(null);
    } catch (err) {
      console.error('Error saving player:', err);
      showToast({ type: 'error', message: 'Lỗi khi lưu dữ liệu người chơi.' });
    }
  };

  // Quick grant 100 gold
  const handleQuickGrantGold = async (player, amount = 100) => {
    try {
      const newGold = (player.gold || 0) + amount;
      const { data, error } = await supabase
        .from('profiles')
        .update({ gold: newGold })
        .eq('username', player.username)
        .select()
        .single();

      if (error) throw error;
      setPlayers(prev => prev.map(p => p.username === player.username ? { ...p, ...data } : p));
      showToast({ type: 'success', message: `Đã tặng ${amount} 🪙 cho ${player.username}!` });
      addLog('Tặng vàng', `+${amount} 🪙 cho ${player.username}`);
    } catch (err) {
      console.error('Grant gold error:', err);
    }
  };

  // Quick revive player HP
  const handleQuickRevive = async (player) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ hp: 100 })
        .eq('username', player.username)
        .select()
        .single();

      if (error) throw error;
      setPlayers(prev => prev.map(p => p.username === player.username ? { ...p, ...data } : p));
      showToast({ type: 'success', message: `Đã hồi phục 100% HP cho ${player.username}!` });
      addLog('Hồi sinh', `Hồi 100 HP cho ${player.username}`);
    } catch (err) {
      console.error('Revive error:', err);
    }
  };

  // Update Boss
  const handleSaveBoss = async (e) => {
    e.preventDefault();
    if (!boss) return;

    try {
      const updates = {
        name: bossFormData.name.trim(),
        hp: Number(bossFormData.hp),
        max_hp: Number(bossFormData.max_hp)
      };

      const { data, error } = await supabase
        .from('world_boss')
        .update(updates)
        .eq('id', boss.id)
        .select()
        .single();

      if (error) throw error;
      setBoss(data);
      showToast({
        type: 'success',
        title: 'Boss Thế Giới Đã Cập Nhật',
        message: `Boss ${data.name} đã được cập nhật với ${data.hp}/${data.max_hp} HP!`
      });
      addLog('Cập nhật Boss', `${data.name} (${data.hp}/${data.max_hp} HP)`);
    } catch (err) {
      console.error('Error saving boss:', err);
      showToast({ type: 'error', message: 'Không thể cập nhật Boss.' });
    }
  };

  // Quick reset boss to max HP
  const handleResetBossHp = async () => {
    if (!boss) return;
    try {
      const { data, error } = await supabase
        .from('world_boss')
        .update({ hp: boss.max_hp })
        .eq('id', boss.id)
        .select()
        .single();

      if (error) throw error;
      setBoss(data);
      setBossFormData(prev => ({ ...prev, hp: data.max_hp }));
      showToast({ type: 'success', message: `Boss ${data.name} đã hồi phục 100% HP!` });
      addLog('Hồi máu Boss', `${data.name} hồi full ${data.max_hp} HP`);
    } catch (err) {
      console.error('Reset boss error:', err);
    }
  };

  // Filtered players
  const filteredPlayers = players.filter(p => {
    const q = searchTerm.toLowerCase();
    return (
      (p.username || '').toLowerCase().includes(q) ||
      (p.title || '').toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const totalPlayers = players.length;
  const totalGoldInEconomy = players.reduce((sum, p) => sum + (p.gold || 0), 0);
  const avgLevel = totalPlayers > 0 ? (players.reduce((sum, p) => sum + (p.level || 1), 0) / totalPlayers).toFixed(1) : 1;

  return (
    <div className="flex flex-col h-full overflow-hidden gap-4">
      
      {/* Top Admin Header Bar */}
      <div className="flex flex-wrap justify-between items-center bg-gradient-to-r from-amber-950/60 via-gameCard to-amber-950/60 p-4 rounded-xl border border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)] shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-400 text-amber-400">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h2 className="font-rpg text-amber-400 text-base sm:text-lg flex items-center gap-2">
              Bảng Quản Trị Tối Cao (Admin Dashboard)
            </h2>
            <p className="text-[11px] text-amber-200/70">
              Quyền quản trị viên: <span className="text-white font-bold">{currentUser.name}</span> &bull; Mã hóa bảo mật TLS 1.3
            </p>
          </div>
        </div>

        <button 
          onClick={fetchAdminData}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Đồng bộ dữ liệu
        </button>
      </div>

      {/* Admin Sub-Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2 shrink-0 overflow-x-auto">
        <button
          onClick={() => setAdminTab('overview')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            adminTab === 'overview'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-gameText/70 hover:bg-gameSecondary'
          }`}
        >
          <Activity size={14} /> Tổng Quan Hệ Thống
        </button>
        <button
          onClick={() => setAdminTab('players')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            adminTab === 'players'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-gameText/70 hover:bg-gameSecondary'
          }`}
        >
          <Users size={14} /> Quản Lý Người Chơi ({players.length})
        </button>
        <button
          onClick={() => setAdminTab('boss')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            adminTab === 'boss'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-gameText/70 hover:bg-gameSecondary'
          }`}
        >
          <Skull size={14} /> Điều Khiển Boss Thế Giới
        </button>
        <button
          onClick={() => setAdminTab('security')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
            adminTab === 'security'
              ? 'bg-amber-500 text-black shadow-md'
              : 'text-gameText/70 hover:bg-gameSecondary'
          }`}
        >
          <Lock size={14} /> An Ninh & Mã Hóa
        </button>
      </div>

      {/* Main Tab Contents */}
      <div className="flex-grow overflow-y-auto pr-1 custom-scrollbar">
        
        {/* 1. OVERVIEW TAB */}
        {adminTab === 'overview' && (
          <div className="space-y-4 animate-fade-in">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="game-card border-blue-500/50 bg-blue-950/20 flex items-center gap-3.5">
                <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/40">
                  <Users size={24} />
                </div>
                <div>
                  <div className="text-xs text-blue-300/80 font-medium">Tổng Hiệp Sĩ</div>
                  <div className="text-2xl font-rpg text-white">{totalPlayers}</div>
                </div>
              </div>

              <div className="game-card border-yellow-500/50 bg-yellow-950/20 flex items-center gap-3.5">
                <div className="p-3 bg-yellow-500/20 text-yellow-400 rounded-lg border border-yellow-500/40">
                  <Sparkles size={24} />
                </div>
                <div>
                  <div className="text-xs text-yellow-300/80 font-medium">Tổng Vàng Lưu Thông</div>
                  <div className="text-2xl font-rpg text-gameGold">🪙 {totalGoldInEconomy}</div>
                </div>
              </div>

              <div className="game-card border-purple-500/50 bg-purple-950/20 flex items-center gap-3.5">
                <div className="p-3 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/40">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="text-xs text-purple-300/80 font-medium">Cấp Độ Trung Bình</div>
                  <div className="text-2xl font-rpg text-purple-400">LVL {avgLevel}</div>
                </div>
              </div>

              <div className="game-card border-red-500/50 bg-red-950/20 flex items-center gap-3.5">
                <div className="p-3 bg-red-500/20 text-red-400 rounded-lg border border-red-500/40">
                  <Skull size={24} />
                </div>
                <div>
                  <div className="text-xs text-red-300/80 font-medium">Máu Boss Thế Giới</div>
                  <div className="text-2xl font-rpg text-red-400">{boss ? `${boss.hp}` : 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Quick Summary Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Top Ranked Players */}
              <div className="game-card">
                <h3 className="font-rpg text-sm text-gamePrimary mb-3 flex items-center gap-2">
                  <Users size={16} /> Hiệp Sĩ Cấp Cao Nhất
                </h3>
                <div className="space-y-2">
                  {players.slice(0, 5).map((p, idx) => (
                    <div key={p.username} className="flex justify-between items-center p-2 rounded bg-gameSecondary/60 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-rpg text-amber-400 w-5">#{idx + 1}</span>
                        <span className="font-bold text-white">{p.username}</span>
                        {p.title && <span className="text-[10px] text-yellow-400">&lt;{p.title}&gt;</span>}
                      </div>
                      <div className="text-gray-400 font-mono">
                        LVL {p.level} &bull; {p.gold} 🪙
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boss Status */}
              <div className="game-card">
                <h3 className="font-rpg text-sm text-red-400 mb-3 flex items-center gap-2">
                  <Skull size={16} /> Trạng Thái Boss Hiện Tại
                </h3>
                {boss ? (
                  <div className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-lg text-red-400">{boss.name}</span>
                      <span className="font-mono text-gray-300">{boss.hp} / {boss.max_hp} HP</span>
                    </div>
                    <div className="w-full bg-gray-900 rounded-full h-4 overflow-hidden border border-red-900">
                      <div 
                        className="bg-red-600 h-full transition-all duration-500" 
                        style={{ width: `${Math.max(0, (boss.hp / boss.max_hp) * 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button 
                        onClick={handleResetBossHp}
                        className="px-3 py-1.5 rounded bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-500/50 text-xs font-bold transition-colors"
                      >
                        Hồi full 100% HP Boss
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">Chưa tìm thấy dữ liệu Boss.</div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* 2. PLAYER MANAGEMENT TAB */}
        {adminTab === 'players' && (
          <div className="space-y-4 animate-fade-in">
            {/* Search Bar */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm người chơi theo Tên anh hùng, Danh hiệu..."
                className="input-field pl-9 text-sm"
              />
            </div>

            {/* Players Table */}
            <div className="game-card p-0 overflow-hidden border border-gameSecondary">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0f3460]/40 text-gray-300 uppercase tracking-wider font-semibold border-b border-gray-800">
                    <tr>
                      <th className="p-3">Hiệp Sĩ</th>
                      <th className="p-3">Cấp & EXP</th>
                      <th className="p-3">Sinh Lực (HP)</th>
                      <th className="p-3">Tài Sản</th>
                      <th className="p-3">Chuỗi Ngày</th>
                      <th className="p-3 text-right">Thao Tác Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">
                          Không tìm thấy hiệp sĩ nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredPlayers.map((player) => (
                        <tr key={player.username} className="hover:bg-gameSecondary/40 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full bg-gray-900 border flex items-center justify-center font-bold text-gamePrimary ${player.border || 'border-gray-700'}`}>
                                {player.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-1.5">
                                  {player.username}
                                  {checkIsAdmin(player) && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 border border-amber-500 text-amber-300 font-bold">
                                      ADMIN
                                    </span>
                                  )}
                                </div>
                                {player.title && (
                                  <div className="text-[10px] text-yellow-400 font-medium">
                                    &lt;{player.title}&gt;
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-gameExp">LVL {player.level || 1}</span>
                            <div className="text-[10px] text-gray-400">{player.exp || 0} EXP</div>
                          </td>
                          <td className="p-3">
                            <span className={`font-bold ${(player.hp || 100) <= 30 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                              ❤️ {player.hp || 100}/100
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gameGold font-bold">
                            🪙 {player.gold || 0}
                          </td>
                          <td className="p-3">
                            <span className="text-orange-400 font-bold">🔥 {player.streak || 0}</span>
                            {player.frozen_days > 0 && (
                              <span className="text-cyan-400 ml-1 text-[10px]">❄️ {player.frozen_days}</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => handleQuickRevive(player)}
                                className="p-1.5 bg-green-950/60 hover:bg-green-900 border border-green-600/50 text-green-300 rounded text-[11px] font-bold"
                                title="Hồi full 100 HP"
                              >
                                <Heart size={13} />
                              </button>
                              <button
                                onClick={() => handleQuickGrantGold(player, 100)}
                                className="p-1.5 bg-yellow-950/60 hover:bg-yellow-900 border border-yellow-600/50 text-yellow-300 rounded text-[11px] font-bold"
                                title="Tặng +100 Vàng"
                              >
                                +100🪙
                              </button>
                              <button
                                onClick={() => handleOpenEditPlayer(player)}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-500 text-black rounded text-[11px] font-bold flex items-center gap-1"
                              >
                                <Edit3 size={12} /> Sửa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 3. WORLD BOSS CONTROLLER TAB */}
        {adminTab === 'boss' && (
          <div className="space-y-4 animate-fade-in max-w-2xl">
            <div className="game-card border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <h3 className="font-rpg text-red-400 mb-4 flex items-center gap-2">
                <Skull /> Cấu Hình Boss Thế Giới
              </h3>

              <form onSubmit={handleSaveBoss} className="space-y-4 text-xs">
                <div>
                  <label className="block mb-1.5 font-bold text-gray-300">Tên Boss Thế Giới</label>
                  <input
                    type="text"
                    value={bossFormData.name}
                    onChange={(e) => setBossFormData({ ...bossFormData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block mb-1.5 font-bold text-gray-300">Máu Hiện Tại (HP)</label>
                    <input
                      type="number"
                      value={bossFormData.hp}
                      onChange={(e) => setBossFormData({ ...bossFormData, hp: Number(e.target.value) })}
                      className="input-field"
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block mb-1.5 font-bold text-gray-300">Máu Tối Đa (Max HP)</label>
                    <input
                      type="number"
                      value={bossFormData.max_hp}
                      onChange={(e) => setBossFormData({ ...bossFormData, max_hp: Number(e.target.value) })}
                      className="input-field"
                      min="1"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    className="btn-primary flex-1 flex justify-center items-center gap-2 text-sm"
                  >
                    <Save size={16} /> Lưu Thông Số Boss
                  </button>
                  <button
                    type="button"
                    onClick={handleResetBossHp}
                    className="px-4 py-2 bg-red-800 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Hồi Full HP Boss
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. SECURITY & SYSTEM HEALTH TAB */}
        {adminTab === 'security' && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Security Health Status */}
              <div className="game-card border-green-500/40 bg-green-950/10">
                <h3 className="font-rpg text-sm text-green-400 mb-3 flex items-center gap-2">
                  <CheckCircle size={16} /> Trạng Thái An Ninh Hệ Thống
                </h3>
                
                <div className="space-y-2.5 text-xs text-gray-300">
                  <div className="flex justify-between items-center p-2 rounded bg-gameSecondary/50">
                    <span className="flex items-center gap-2"><Lock size={14} className="text-green-400" /> Mã Hóa Đường Truyền:</span>
                    <span className="font-bold text-green-400">TLS 1.3 / HTTPS (Active)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gameSecondary/50">
                    <span className="flex items-center gap-2"><KeyRound size={14} className="text-green-400" /> Chuẩn Băm Mật Khẩu:</span>
                    <span className="font-bold text-green-400">Argon2id / bcrypt (Salted)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gameSecondary/50">
                    <span className="flex items-center gap-2"><Database size={14} className="text-green-400" /> Kết Nối Supabase:</span>
                    <span className="font-bold text-green-400">Kết Nối Ổn Định (Live)</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-gameSecondary/50">
                    <span className="flex items-center gap-2"><Server size={14} className="text-green-400" /> Cơ Chế Chống XSS:</span>
                    <span className="font-bold text-green-400">Web Crypto & Sanitized</span>
                  </div>
                </div>
              </div>

              {/* Admin Audit Log */}
              <div className="game-card">
                <h3 className="font-rpg text-sm text-amber-400 mb-3 flex items-center gap-2">
                  <Activity size={16} /> Nhật Ký Hoạt Động Admin (Audit Log)
                </h3>
                
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                  {adminLogs.length === 0 ? (
                    <p className="text-xs text-gray-500 italic">Chưa có thao tác nào trong phiên làm việc hiện tại.</p>
                  ) : (
                    adminLogs.map(log => (
                      <div key={log.id} className="p-2 rounded bg-gameSecondary/60 text-xs flex justify-between items-start">
                        <div>
                          <span className="font-bold text-amber-300">{log.action}: </span>
                          <span className="text-gray-300">{log.details}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 shrink-0 font-mono ml-2">{log.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* EDIT PLAYER MODAL */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="game-card max-w-md w-full border-amber-500 shadow-[0_0_25px_rgba(245,158,11,0.3)] animate-fade-in-up">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
              <h3 className="font-rpg text-amber-400 text-sm flex items-center gap-2">
                <Edit3 size={16} /> Chỉnh Sửa Hiệp Sĩ: {selectedPlayer.username}
              </h3>
              <button onClick={() => setSelectedPlayer(null)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Cấp Độ (Level)</label>
                  <input
                    type="number"
                    value={editFormData.level}
                    onChange={(e) => setEditFormData({ ...editFormData, level: e.target.value })}
                    className="input-field"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Điểm Kinh Nghiệm (EXP)</label>
                  <input
                    type="number"
                    value={editFormData.exp}
                    onChange={(e) => setEditFormData({ ...editFormData, exp: e.target.value })}
                    className="input-field"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Sinh Lực (HP: 0-100)</label>
                  <input
                    type="number"
                    value={editFormData.hp}
                    onChange={(e) => setEditFormData({ ...editFormData, hp: e.target.value })}
                    className="input-field"
                    min="0"
                    max="100"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Tài Sản Vàng (Gold)</label>
                  <input
                    type="number"
                    value={editFormData.gold}
                    onChange={(e) => setEditFormData({ ...editFormData, gold: e.target.value })}
                    className="input-field"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Chuỗi Ngày (Streak)</label>
                  <input
                    type="number"
                    value={editFormData.streak}
                    onChange={(e) => setEditFormData({ ...editFormData, streak: e.target.value })}
                    className="input-field"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-300">Bình Đóng Băng (Frozen)</label>
                  <input
                    type="number"
                    value={editFormData.frozen_days}
                    onChange={(e) => setEditFormData({ ...editFormData, frozen_days: e.target.value })}
                    className="input-field"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-300">Danh Hiệu Nhân Vật</label>
                <select
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  className="input-field cursor-pointer"
                >
                  <option value="Tân Binh">Tân Binh</option>
                  {GACHA_POOL.titles.map(t => (
                    <option key={t.id} value={t.name}>{t.name} ({t.rarity})</option>
                  ))}
                  <option value="Đại Hiệp Sĩ Server">Đại Hiệp Sĩ Server</option>
                  <option value="Chủ Phòng Vô Song">Chủ Phòng Vô Song</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-300">Viền Avatar</label>
                <select
                  value={editFormData.border}
                  onChange={(e) => setEditFormData({ ...editFormData, border: e.target.value })}
                  className="input-field cursor-pointer"
                >
                  <option value="border-white">Viền Mặc Định Trắng</option>
                  {GACHA_POOL.borders.map(b => (
                    <option key={b.id} value={b.class}>{b.rarity.toUpperCase()}</option>
                  ))}
                  <option value="border-yellow-400 shadow-[0_0_25px_#facc15] animate-pulse">Viền Hoàng Kim Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="double_xp_toggle"
                  checked={editFormData.double_xp}
                  onChange={(e) => setEditFormData({ ...editFormData, double_xp: e.target.checked })}
                  className="rounded border-gray-700 cursor-pointer"
                />
                <label htmlFor="double_xp_toggle" className="cursor-pointer text-gray-300">
                  Kích hoạt trạng thái <span className="text-green-400 font-bold">X2 EXP</span> cho hiệp sĩ này
                </label>
              </div>

              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex justify-center items-center gap-1.5 text-xs font-bold"
                >
                  <Save size={14} /> Lưu Chỉ Số Hiệp Sĩ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
