import { useState, useEffect } from 'react';
import { Sword, Shield, BookOpen, ShoppingBag, Backpack, History } from 'lucide-react';
import { supabase } from './lib/supabase';
import SidebarProfile from './components/SidebarProfile';
import TaskList from './components/TaskList';
import Shop from './components/Shop';
import Inventory from './components/Inventory';

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('tasks');

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
      // Logic Soft Delete: move to history if completed > 3 days ago or completed in general
      // For V2.1, we move completed tasks to 'history' immediately (or via a cron job, but we do it here for MVP).
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
      
      // Update DB Tasks
      for (const update of tasksToUpdate) {
        await supabase.from('tasks').update(update).eq('id', update.id);
      }

      // Apply HP Penalty
      if (hpPenalty > 0) {
        let newHp = (currentUser.hp || 100) - hpPenalty;
        let newLevel = currentUser.level || 1;
        let alertMsg = `Bạn bị trừ ${hpPenalty} HP do có task quá hạn!`;

        if (newHp <= 0) {
          newHp = 100;
          newLevel = Math.max(1, newLevel - 1);
          alertMsg += `\n💀 Nhân vật đã kiệt sức. Bị giáng xuống Cấp độ ${newLevel}.`;
        }

        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update({ hp: newHp, level: newLevel, streak: 0 }) // Reset streak on HP penalty
          .eq('username', currentUser.name)
          .select()
          .single();
          
        if (updatedProfile) {
          const newUser = { ...currentUser, ...updatedProfile };
          setUser(newUser);
          localStorage.setItem('rpg_user', JSON.stringify(newUser));
        }
        alert(alertMsg);
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

  const calculateReward = (diff) => {
    switch (diff) {
      case 'Dễ': return { exp: 10, gold: 5 };
      case 'Vừa': return { exp: 25, gold: 15 };
      case 'Khó': return { exp: 50, gold: 30 };
      default: return { exp: 25, gold: 15 };
    }
  };

  const handleLevelUp = async (currentExp, currentLevel) => {
    const nextLevelExp = currentLevel * 100;
    if (currentExp >= nextLevelExp) {
      alert(`🎉 Chúc mừng! Bạn đã đạt Cấp độ ${currentLevel + 1}!`);
      return currentLevel + 1;
    }
    return currentLevel;
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
        const reward = calculateReward(task.difficulty);
        let newExp = user.exp + reward.exp;
        let newGold = user.gold + reward.gold;
        let newLevel = await handleLevelUp(newExp, user.level);
        
        updateUserProfile({ exp: newExp, gold: newGold, level: newLevel });
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
    <div className="h-screen bg-[#1a1a2e] text-gameText p-4 md:p-6 overflow-hidden flex flex-col">
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
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-all text-sm ${activeTab === 'history' ? 'bg-gray-600 text-white shadow-lg' : 'text-gameText hover:bg-gameSecondary'}`}
            >
              <History size={16} /> Lịch sử
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
