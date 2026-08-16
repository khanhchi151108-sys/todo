import { useState, useEffect } from 'react';
import { Sword, Shield, BookOpen, ShoppingBag, Backpack, History, Users } from 'lucide-react';
import { supabase } from './lib/supabase';
import SidebarProfile from './components/SidebarProfile';
import TaskList from './components/TaskList';
import Shop from './components/Shop';
import Inventory from './components/Inventory';
import PomodoroTimer from './components/PomodoroTimer';
import Gacha from './components/Gacha';
import Social from './components/Social';

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');
  
  // Modals state
  const [showPomodoro, setShowPomodoro] = useState(false);
  const [showGacha, setShowGacha] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('rpg_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchData(parsedUser);
    }
  }, []);

  const fetchData = async (currentUser) => {
    // Fetch Tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', currentUser.name)
      .order('created_at', { ascending: false });
      
    if (tasksData) {
      setTasks(tasksData);
      checkOverdueAndSoftDelete(tasksData, currentUser);
    }

    // Fetch Inventory
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', currentUser.name);
    if (invData) setInventory(invData.map(i => i.item_id));
  };

  const checkOverdueAndSoftDelete = async (currentTasks, currentUser) => {
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

    if (hpPenalty > 0 || tasksToUpdate.length > 0) {
      setTasks(updatedTasks);
      
      for (const update of tasksToUpdate) {
        await supabase.from('tasks').update(update).eq('id', update.id);
      }

      if (hpPenalty > 0) {
        // Check for streak freeze
        if (currentUser.frozen_days > 0) {
          alert('Bình Đóng Băng đã phát huy tác dụng! Bạn không bị trừ HP và giữ nguyên Chuỗi ngày.');
          const newFrozen = currentUser.frozen_days - 1;
          await updateUserProfile({ frozen_days: newFrozen });
        } else {
          let newHp = (currentUser.hp || 100) - hpPenalty;
          let newLevel = currentUser.level || 1;
          let alertMsg = `Bạn bị trừ ${hpPenalty} HP do có task quá hạn!`;

          if (newHp <= 0) {
            newHp = 100;
            newLevel = Math.max(1, newLevel - 1);
            alertMsg += `\n💀 Nhân vật đã kiệt sức. Bị giáng xuống Cấp độ ${newLevel}.`;
          }

          await updateUserProfile({ hp: newHp, level: newLevel, streak: 0 });
          alert(alertMsg);
        }
      }
    }
  };

  const syncProfile = async (username) => {
    const { data } = await supabase.from('profiles').select('*').eq('username', username).single();
    if (!data) {
      const { data: newProfile } = await supabase.from('profiles').insert([{ username }]).select().single();
      return newProfile;
    }
    return data;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target.username.value;
    if (username.trim()) {
      const profile = await syncProfile(username);
      const newUser = { name: username, ...profile };
      setUser(newUser);
      localStorage.setItem('rpg_user', JSON.stringify(newUser));
      fetchData(newUser);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTasks([]);
    setInventory([]);
    localStorage.removeItem('rpg_user');
  };

  const calculateReward = (diff, isDoubleXp) => {
    let exp = 25;
    let gold = 15;
    switch (diff) {
      case 'Dễ': exp = 10; gold = 5; break;
      case 'Khó': exp = 50; gold = 30; break;
    }
    if (isDoubleXp) {
      exp *= 2;
    }
    return { exp, gold };
  };

  const handleLevelUp = async (currentExp, currentLevel) => {
    const nextLevelExp = currentLevel * 100;
    if (currentExp >= nextLevelExp) {
      alert(`🎉 Chúc mừng! Bạn đã đạt Cấp độ ${currentLevel + 1}!`);
      return currentLevel + 1;
    }
    return currentLevel;
  };

  const dealBossDamage = async () => {
    // Basic implementation for Boss fight MVP
    const { data: boss } = await supabase.from('world_boss').select('*').limit(1).single();
    if (boss && boss.hp > 0) {
      const newHp = Math.max(0, boss.hp - 10);
      await supabase.from('world_boss').update({ hp: newHp }).eq('id', boss.id);
      if (newHp === 0 && boss.hp > 0) {
        alert('🎉 BOSS THẾ GIỚI ĐÃ BỊ TIÊU DIỆT! Toàn server nhận được phần thưởng vinh quang!');
      }
    }
  };

  const addTask = async (taskData) => {
    if (taskData.id) {
      const { data } = await supabase
        .from('tasks')
        .update({
          text: taskData.text,
          difficulty: taskData.difficulty,
          tag: taskData.tag,
          deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null
        })
        .eq('id', taskData.id)
        .select()
        .single();
        
      if (data) setTasks(tasks.map(t => t.id === taskData.id ? data : t));
    } else {
      const { data } = await supabase
        .from('tasks')
        .insert([{ 
          user_id: user.name, 
          text: taskData.text,
          difficulty: taskData.difficulty,
          tag: taskData.tag,
          deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
          type: taskData.type || 'one-time'
        }])
        .select()
        .single();
      
      if (data) setTasks([data, ...tasks]);
    }
  };

  const toggleTask = async (task) => {
    const newCompleted = !task.completed;
    const newStatus = newCompleted ? 'history' : 'active';
    
    const { data } = await supabase
      .from('tasks')
      .update({ completed: newCompleted, status: newStatus })
      .eq('id', task.id)
      .select()
      .single();

    if (data) {
      setTasks(tasks.map(t => t.id === task.id ? data : t));
      
      if (newCompleted) {
        const reward = calculateReward(task.difficulty, user.double_xp);
        let newExp = user.exp + reward.exp;
        let newGold = user.gold + reward.gold;
        let newLevel = await handleLevelUp(newExp, user.level);
        
        let newStreak = (user.streak || 0) + 1; // Increase streak
        
        const updates = { exp: newExp, gold: newGold, level: newLevel, streak: newStreak };
        if (user.double_xp) {
          updates.double_xp = false; // Turn off double XP after one use
          alert('Nhân đôi XP đã được áp dụng!');
        }
        updateUserProfile(updates);
        
        // Attack Boss
        dealBossDamage();
      }
    }
  };

  const deleteTask = async (id) => {
    await supabase.from('tasks').delete().eq('id', id);
    setTasks(tasks.filter(t => t.id !== id));
  };

  const updateUserProfile = async (updates) => {
    const { data: updatedProfile } = await supabase
      .from('profiles')
      .update(updates)
      .eq('username', user.name)
      .select()
      .single();
      
    if (updatedProfile) {
      const newUser = { ...user, ...updatedProfile };
      setUser(newUser);
      localStorage.setItem('rpg_user', JSON.stringify(newUser));
    }
  };

  const buyItem = async (item) => {
    if (user.gold < item.price) return;
    
    await updateUserProfile({ gold: user.gold - item.price });

    if (item.consumable) {
      if (item.id === 'health_potion') {
        const newHp = Math.min(100, (user.hp || 100) + 20);
        await updateUserProfile({ hp: newHp });
        alert(`Bạn đã dùng ${item.name} và hồi 20 HP!`);
      } else if (item.id === 'streak_freeze') {
        const newFrozen = (user.frozen_days || 0) + 1;
        await updateUserProfile({ frozen_days: newFrozen });
        alert('Đã kích hoạt Bình Đóng Băng! Bạn được bảo vệ Streak thêm 1 ngày.');
      } else if (item.id === 'focus_potion') {
        setShowPomodoro(true);
      } else if (item.id === 'gacha_ticket') {
        setShowGacha(true);
      }
    } else {
      const { data } = await supabase.from('inventory').insert([{ user_id: user.name, item_id: item.id }]).select().single();
      if (data) {
        setInventory([...inventory, item.id]);
      }
    }
  };

  const equipItem = async (item) => {
    if (item.consumable) return;
    await updateUserProfile({ equipped_item: item.id });
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
          <div className="absolute top-[20%] left-[10%] w-64 h-64 bg-gamePrimary rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-[40%] right-[10%] w-72 h-72 bg-gameEasy rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>
        <div className="game-card w-full max-w-md animate-fade-in-up">
          <div className="text-center mb-8">
            <Sword className="w-16 h-16 mx-auto text-gamePrimary mb-4 animate-bounce" />
            <h1 className="text-3xl font-rpg text-transparent bg-clip-text bg-gradient-to-r from-gamePrimary to-gameEasy">
              Quest Log V2
            </h1>
            <p className="text-gameText opacity-70 mt-2">Đăng nhập để kết nối server</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Tên anh hùng</label>
              <input type="text" name="username" className="input-field" placeholder="Nhập tên nhân vật..." required />
            </div>
            <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 text-lg py-3">
              <Shield size={20} /> Đăng nhập
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1a1a2e] text-gameText p-4 md:p-6 overflow-hidden flex flex-col relative">
      {/* Modals */}
      {showPomodoro && (
        <PomodoroTimer 
          user={user} 
          onClose={() => setShowPomodoro(false)} 
          onComplete={(updatedProfile) => {
            setShowPomodoro(false);
            setUser({ ...user, ...updatedProfile });
            localStorage.setItem('rpg_user', JSON.stringify({ ...user, ...updatedProfile }));
          }} 
        />
      )}
      
      {showGacha && (
        <Gacha 
          user={user} 
          onClose={() => setShowGacha(false)}
          onReward={(updatedProfile) => {
            setUser({ ...user, ...updatedProfile });
            localStorage.setItem('rpg_user', JSON.stringify({ ...user, ...updatedProfile }));
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
          </div>
        </div>
      </div>
    </div>
  );
}
