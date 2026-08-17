import { useState, useEffect, useCallback } from 'react';
import { BookOpen, ShoppingBag, Backpack, History, Users, ShieldAlert } from 'lucide-react';
import { supabase } from './lib/supabase';
import SidebarProfile from './components/SidebarProfile';
import TaskList from './components/TaskList';
import Shop from './components/Shop';
import Inventory from './components/Inventory';
import PomodoroTimer from './components/PomodoroTimer';
import Gacha from './components/Gacha';
import Social from './components/Social';
import AuthModal from './components/AuthModal';
import Toast from './components/Toast';
import AdminDashboard from './components/AdminDashboard';
import { checkIsAdmin } from './lib/adminAuth';
import { sanitizeText } from './lib/crypto';

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showGacha, setShowGacha] = useState(false);

  // Toast Helper
  const showToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Update user profile in Supabase
  const updateUserProfile = useCallback(async (updates, targetUsername) => {
    const username = targetUsername || user?.name;
    if (!username) return;
    try {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('username', username)
        .select()
        .single();

      if (error) throw error;
      if (updatedProfile) {
        setUser(prev => {
          const next = { ...prev, ...updatedProfile };
          localStorage.setItem('rpg_user', JSON.stringify(next));
          return next;
        });
      }
    } catch (err) {
      console.error('Update profile error:', err);
    }
  }, [user?.name]);

  // Batch check overdue and soft delete completed tasks
  const checkOverdueAndSoftDelete = useCallback(async (currentTasks, currentUser) => {
    if (!currentUser) return;
    const now = new Date();
    let hpPenalty = 0;
    const tasksToUpdate = [];

    const updatedTasks = currentTasks.map(task => {
      if (task.completed && task.status !== 'history') {
        tasksToUpdate.push({ id: task.id, status: 'history' });
        return { ...task, status: 'history' };
      }

      if (!task.completed && !task.penalty_applied && task.deadline && task.status !== 'history') {
        const taskDeadline = new Date(task.deadline);
        if (now > taskDeadline) {
          hpPenalty += 10;
          tasksToUpdate.push({ id: task.id, penalty_applied: true });
          return { ...task, penalty_applied: true };
        }
      }
      return task;
    });

    if (tasksToUpdate.length > 0 || hpPenalty > 0) {
      setTasks(updatedTasks);

      // Batch DB update for all changed tasks
      await Promise.all(
        tasksToUpdate.map(item =>
          supabase.from('tasks').update(item).eq('id', item.id)
        )
      );

      if (hpPenalty > 0) {
        if (currentUser.frozen_days > 0) {
          showToast({
            type: 'info',
            title: 'Bình Đóng Băng Kích Hoạt!',
            message: 'Bình Đóng Băng đã bảo vệ bạn: Không bị trừ HP và giữ nguyên Chuỗi ngày.'
          });
          const newFrozen = currentUser.frozen_days - 1;
          await updateUserProfile({ frozen_days: newFrozen }, currentUser.name);
        } else {
          let newHp = (currentUser.hp || 100) - hpPenalty;
          let newLevel = currentUser.level || 1;
          let message = `Bạn bị trừ ${hpPenalty} HP do có nhiệm vụ quá hạn!`;

          if (newHp <= 0) {
            newHp = 100;
            newLevel = Math.max(1, newLevel - 1);
            message += `\n💀 Nhân vật kiệt sức! Bị giáng xuống Cấp độ ${newLevel}.`;
          }

          await updateUserProfile({ hp: newHp, level: newLevel, streak: 0 }, currentUser.name);
          showToast({
            type: 'warning',
            title: 'Cảnh Báo Quá Hạn',
            message
          });
        }
      }
    }
  }, [showToast, updateUserProfile]);

  // Fetch tasks and inventory for authenticated user
  const fetchData = useCallback(async (currentUser) => {
    if (!currentUser?.name) return;
    try {
      // 1. Fetch Tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUser.name)
        .order('created_at', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
      } else if (tasksData) {
        setTasks(tasksData);
        checkOverdueAndSoftDelete(tasksData, currentUser);
      }

      // 2. Fetch Inventory
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', currentUser.name);

      if (invError) {
        console.error('Error fetching inventory:', invError);
      } else if (invData) {
        setInventory(invData.map(i => i.item_id));
      }
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  }, [checkOverdueAndSoftDelete]);

  // Fetch or create profile based on Supabase Auth session
  const syncProfile = useCallback(async (authUser) => {
    try {
      const username = authUser.user_metadata?.username || authUser.name || authUser.email?.split('@')[0] || 'Anh Hùng';
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Profile fetch error:', error);
      }

      if (data) {
        const fullUser = {
          id: authUser.id || 'auth-user',
          name: data.username,
          email: authUser.email,
          ...data
        };
        setUser(fullUser);
        localStorage.setItem('rpg_user', JSON.stringify(fullUser));
        return fullUser;
      }

      // Insert new profile if not exists
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          username: username,
          level: 1,
          exp: 0,
          hp: 100,
          gold: 50,
          streak: 0,
          frozen_days: 0,
          title: 'Tân Binh',
          double_xp: false
        }])
        .select()
        .single();

      if (createError) {
        console.warn('Profile create note:', createError);
      }

      const createdUser = {
        id: authUser.id || 'auth-user',
        name: newProfile?.username || username,
        email: authUser.email,
        level: 1,
        exp: 0,
        hp: 100,
        gold: 50,
        streak: 0,
        frozen_days: 0,
        title: 'Tân Binh',
        ...(newProfile || {})
      };
      setUser(createdUser);
      localStorage.setItem('rpg_user', JSON.stringify(createdUser));
      return createdUser;
    } catch (err) {
      console.error('Profile sync exception:', err);
      return null;
    }
  }, []);

  // Check auth session on startup and subscribe to auth state changes
  useEffect(() => {
    let isMounted = true;

    // H3 fix: localStorage only restores UI instantly (no fetchData to avoid double-fetch)
    const savedLocalUser = localStorage.getItem('rpg_user');
    if (savedLocalUser) {
      try {
        const parsed = JSON.parse(savedLocalUser);
        if (parsed?.name) {
          setUser(parsed);
          // H5 fix: Don't auto-switch to admin tab on F5
        }
      } catch (e) {
        console.error('Local user parse error:', e);
      }
    }

    supabase.auth.getSession().then(async ({ data: { session: currentSession } }) => {
      if (!isMounted) return;
      if (currentSession?.user) {
        const profile = await syncProfile(currentSession.user);
        if (profile) {
          await fetchData(profile);
        }
      } else if (savedLocalUser) {
        // No Supabase session but has localStorage (Admin PIN login) — fetch data
        try {
          const parsed = JSON.parse(savedLocalUser);
          if (parsed?.name) {
            await fetchData(parsed);
          }
        } catch { /* already handled above */ }
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      if (newSession?.user) {
        const profile = await syncProfile(newSession.user);
        if (profile) {
          await fetchData(profile);
        }
      } else if (!localStorage.getItem('rpg_user')) {
        setUser(null);
        setTasks([]);
        setInventory([]);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [syncProfile, fetchData]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('rpg_user');
    setUser(null);
    setTasks([]);
    setInventory([]);
    setActiveTab('tasks');
    showToast({
      type: 'info',
      title: 'Đã Đăng Xuất',
      message: 'Hẹn gặp lại!'
    });
  };

  const calculateReward = (diff, isDoubleXp) => {
    let exp = 25;
    let gold = 15;
    switch (diff) {
      case 'Dễ': exp = 10; gold = 5; break;
      case 'Khó': exp = 50; gold = 30; break;
      default: exp = 25; gold = 15; break;
    }
    if (isDoubleXp) {
      exp *= 2;
    }
    return { exp, gold };
  };

  // Level up calculation with overflow EXP
  const calculateLevelUp = (currentExp, currentLevel) => {
    let exp = currentExp;
    let level = currentLevel;
    let leveledUp = false;

    while (exp >= level * 100) {
      exp -= level * 100;
      level += 1;
      leveledUp = true;
    }

    return { newExp: exp, newLevel: level, leveledUp };
  };

  // World Boss attack — H4 fix: use RPC for atomic operation
  const dealBossDamage = async () => {
    try {
      // Try RPC first (atomic, race-condition safe)
      const { error: rpcErr } = await supabase.rpc('attack_world_boss', { damage_amount: 10 });
      if (rpcErr) {
        // Fallback to manual update if RPC doesn't exist
        const { data: boss } = await supabase.from('world_boss').select('*').limit(1).maybeSingle();
        if (boss && boss.hp > 0) {
          const newHp = Math.max(0, boss.hp - 10);
          await supabase.from('world_boss').update({ hp: newHp }).eq('id', boss.id);
          if (newHp === 0) {
            showToast({
              type: 'level-up',
              title: 'CHIẾN THẮNG!',
              message: 'Boss Thế Giới đã bị tiêu diệt!'
            });
          }
        }
      }
    } catch (err) {
      console.warn('Boss damage error:', err);
    }
  };

  const addTask = async (taskData) => {
    if (!user) return;

    try {
      const cleanText = sanitizeText(taskData.text?.trim());
      if (!cleanText) return;

      if (taskData.id) {
        const { data, error } = await supabase
          .from('tasks')
          .update({
            text: cleanText,
            difficulty: taskData.difficulty,
            tag: taskData.tag,
            deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null
          })
          .eq('id', taskData.id)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTasks(prev => prev.map(t => t.id === taskData.id ? data : t));
          showToast({ type: 'success', message: 'Đã cập nhật nhiệm vụ.' });
        }
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert([{
            user_id: user.name,
            text: cleanText,
            difficulty: taskData.difficulty,
            tag: taskData.tag,
            deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
            type: taskData.type || 'one-time'
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setTasks(prev => [data, ...prev]);
          showToast({ type: 'success', message: 'Đã nhận nhiệm vụ mới!' });
        }
      }
    } catch (err) {
      console.error('Task save error:', err);
      showToast({ type: 'error', title: 'Lỗi', message: 'Không thể lưu nhiệm vụ.' });
    }
  };

  const toggleTask = async (task) => {
    if (!user) return;
    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'history' : 'active';

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed: newCompleted, status: newStatus })
        .eq('id', task.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setTasks(prev => prev.map(t => t.id === task.id ? data : t));

        if (newCompleted) {
          const reward = calculateReward(task.difficulty, user.double_xp);
          const rawExp = (user.exp || 0) + reward.exp;
          const { newExp, newLevel, leveledUp } = calculateLevelUp(rawExp, user.level || 1);
          const newGold = (user.gold || 0) + reward.gold;

          // M1 fix: Calculate streak by daily active completion
          const todayKey = new Date().toISOString().split('T')[0];
          const lastStreakDate = localStorage.getItem(`rpg_streak_date_${user.name}`);
          let newStreak = user.streak || 0;

          if (lastStreakDate !== todayKey) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayKey = yesterday.toISOString().split('T')[0];

            if (lastStreakDate === yesterdayKey || !lastStreakDate || newStreak === 0) {
              newStreak += 1;
            } else {
              newStreak = 1;
            }
            localStorage.setItem(`rpg_streak_date_${user.name}`, todayKey);
          }

          const updates = { exp: newExp, gold: newGold, level: newLevel, streak: newStreak };
          if (user.double_xp) {
            updates.double_xp = false;
          }

          await updateUserProfile(updates);

          showToast({
            type: leveledUp ? 'level-up' : 'success',
            title: leveledUp ? `🎉 LÊN CẤP ${newLevel}!` : 'Nhiệm Vụ Hoàn Thành!',
            message: `+${reward.exp} EXP | +${reward.gold} 🪙 Gold${user.double_xp ? ' (X2 EXP)' : ''}`
          });

          // Attack World Boss
          dealBossDamage();
        }
      }
    } catch (err) {
      console.error('Toggle task error:', err);
      showToast({ type: 'error', message: 'Không thể cập nhật trạng thái nhiệm vụ.' });
    }
  };

  const deleteTask = async (id) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.filter(t => t.id !== id));
      showToast({ type: 'info', message: 'Đã xóa nhiệm vụ.' });
    } catch (err) {
      console.error('Delete task error:', err);
      showToast({ type: 'error', message: 'Không thể xóa nhiệm vụ.' });
    }
  };

  // Buy item with batched atomic updates
  const buyItem = async (item) => {
    if (!user || user.gold < item.price) {
      showToast({ type: 'warning', message: 'Không đủ vàng!' });
      return;
    }

    // M3 fix: Prevent duplicate purchase of non-consumable items
    if (!item.consumable && inventory.includes(item.id)) {
      showToast({ type: 'warning', message: `Bạn đã sở hữu ${item.name} rồi!` });
      return;
    }

    try {
      const newGold = user.gold - item.price;

      if (item.consumable) {
        if (item.id === 'health_potion') {
          const newHp = Math.min(100, (user.hp || 100) + 20);
          await updateUserProfile({ gold: newGold, hp: newHp });
          showToast({ type: 'success', title: 'Hồi Máu', message: `Đã dùng ${item.name} (+20 HP)` });
        } else if (item.id === 'streak_freeze') {
          const newFrozen = (user.frozen_days || 0) + 1;
          await updateUserProfile({ gold: newGold, frozen_days: newFrozen });
          showToast({ type: 'success', title: 'Đóng Băng', message: 'Kích hoạt Bình Đóng Băng (+1 ngày)' });
        } else if (item.id === 'focus_potion') {
          await updateUserProfile({ gold: newGold });
          setShowPomodoro(true);
        } else if (item.id === 'gacha_ticket') {
          await updateUserProfile({ gold: newGold });
          setShowGacha(true);
        }
      } else {
        const { data, error } = await supabase
          .from('inventory')
          .insert([{ user_id: user.name, item_id: item.id }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          await updateUserProfile({ gold: newGold });
          setInventory(prev => [...prev, item.id]);
          showToast({ type: 'success', title: 'Mua Thành Công', message: `Đã nhận ${item.name}!` });
        }
      }
    } catch (err) {
      console.error('Buy item error:', err);
      showToast({ type: 'error', message: 'Giao dịch thất bại.' });
    }
  };

  const equipItem = async (item) => {
    if (item.consumable) return;
    await updateUserProfile({ equipped_item: item.id });
    showToast({ type: 'info', message: `Đã trang bị ${item.name}!` });
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-gameText">
        <div className="w-12 h-12 border-4 border-gamePrimary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-rpg text-sm text-gamePrimary animate-pulse">Đang tải...</p>
      </div>
    );
  }

  // Not authenticated -> Show Auth Modal
  if (!user) {
    return (
      <>
        <Toast toasts={toasts} removeToast={removeToast} />
        <AuthModal 
          onAuthSuccess={async (authUser) => {
            const profile = await syncProfile(authUser);
            const finalUser = profile || authUser;
            setUser(finalUser);
            localStorage.setItem('rpg_user', JSON.stringify(finalUser));
            // C1 fix: ensure loading state is cleared for Admin PIN login
            setLoading(false);
            // H5: only set admin tab on explicit first login
            if (checkIsAdmin(finalUser)) {
              setActiveTab('admin');
            }
            await fetchData(finalUser);
          }} 
          showToast={showToast} 
        />
      </>
    );
  }

  const isUserAdmin = checkIsAdmin(user);

  return (
    <div className="h-screen bg-[#1a1a2e] text-gameText p-4 md:p-6 overflow-hidden flex flex-col relative">
      {/* Toast Notifications */}
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Modals */}
      {showPomodoro && (
        <PomodoroTimer 
          user={user} 
          onClose={() => setShowPomodoro(false)} 
          onComplete={(updatedProfile) => {
            setShowPomodoro(false);
            setUser(prev => ({ ...prev, ...updatedProfile }));
            showToast({
              type: 'success',
              title: 'Hoàn Thành Tập Trung!',
              message: 'Nhận X2 XP cho nhiệm vụ tiếp theo!'
            });
          }} 
        />
      )}
      
      {showGacha && (
        <Gacha 
          user={user} 
          onClose={() => setShowGacha(false)}
          onReward={(updatedProfile) => {
            setUser(prev => ({ ...prev, ...updatedProfile }));
            showToast({
              type: 'level-up',
              title: 'Vật Phẩm Mới!',
              message: 'Chúc mừng bạn đã quay được phần thưởng mới!'
            });
          }}
        />
      )}

      <div className="flex flex-col md:flex-row gap-6 h-full max-w-7xl mx-auto w-full">
        
        {/* Left Panel: Profile */}
        <div className="w-full md:w-1/3 lg:w-1/4 shrink-0 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <SidebarProfile user={user} handleLogout={handleLogout} />
        </div>

        {/* Right Panel: Main Content */}
        <div className="w-full md:w-2/3 lg:w-3/4 flex flex-col h-full bg-[#16213e]/50 rounded-xl border border-gameSecondary backdrop-blur-sm overflow-hidden shadow-2xl">
          {/* Tabs */}
          <div className="flex flex-wrap gap-2 p-4 border-b border-gameSecondary bg-[#0f3460]/20 shrink-0">
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'tasks' ? 'bg-gamePrimary text-white shadow-lg' : 'text-gameText hover:bg-gameSecondary'}`}
            >
              <BookOpen size={16} /> Nhiệm vụ
            </button>
            <button 
              onClick={() => setActiveTab('social')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'social' ? 'bg-purple-600 text-white shadow-lg' : 'text-gameText hover:bg-gameSecondary'}`}
            >
              <Users size={16} /> Cộng đồng
            </button>
            <button 
              onClick={() => setActiveTab('shop')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'shop' ? 'bg-gameGold text-black shadow-lg' : 'text-gameText hover:bg-gameSecondary'}`}
            >
              <ShoppingBag size={16} /> Cửa hàng
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'inventory' ? 'bg-gameEasy text-white shadow-lg' : 'text-gameText hover:bg-gameSecondary'}`}
            >
              <Backpack size={16} /> Túi đồ
            </button>
            
            {/* Admin Tab - Exclusively for Admin users */}
            {isUserAdmin && (
              <button 
                onClick={() => setActiveTab('admin')}
                className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'admin' ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'text-amber-400 hover:bg-amber-950/40 border border-amber-500/40'}`}
              >
                <ShieldAlert size={16} /> Quản trị
              </button>
            )}

            <button 
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ml-auto ${activeTab === 'history' ? 'bg-gray-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gameSecondary'}`}
            >
              <History size={16} /> Lịch sử
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-grow p-4 overflow-hidden">
            {(activeTab === 'tasks' || activeTab === 'history') && (
              <TaskList 
                tasks={tasks} 
                addTask={addTask} 
                toggleTask={toggleTask} 
                deleteTask={deleteTask} 
                activeTab={activeTab}
              />
            )}

            {activeTab === 'social' && (
              <Social user={user} />
            )}
            
            {activeTab === 'shop' && (
              <Shop user={user} inventory={inventory} buyItem={buyItem} />
            )}

            {activeTab === 'inventory' && (
              <Inventory user={user} inventory={inventory} equipItem={equipItem} />
            )}

            {activeTab === 'admin' && isUserAdmin && (
              <AdminDashboard currentUser={user} showToast={showToast} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
