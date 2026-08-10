import { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Edit2, LogOut, Sword, Shield, BookOpen, Dumbbell, Briefcase, ShoppingBag, Backpack, Sparkles, Heart, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';

const ITEMS_DB = [
  { id: 'wooden_sword', name: 'Kiếm Gỗ', price: 50, icon: Sword, color: 'text-yellow-600', desc: 'Vũ khí cơ bản cho người mới bắt đầu.' },
  { id: 'iron_shield', name: 'Khiên Sắt', price: 100, icon: Shield, color: 'text-gray-400', desc: 'Tăng cường sức chịu đựng.' },
  { id: 'magic_cloak', name: 'Áo Choàng Phép', price: 300, icon: Sparkles, color: 'text-purple-500', desc: 'Ánh sáng lấp lánh kỳ bí.' },
  { id: 'health_potion', name: 'Bình Máu', price: 50, icon: Heart, color: 'text-red-500', desc: 'Hồi 20 HP ngay lập tức.', consumable: true },
];

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  
  const [newTask, setNewTask] = useState('');
  const [difficulty, setDifficulty] = useState('Vừa');
  const [tag, setTag] = useState('Học tập');
  const [deadline, setDeadline] = useState('');
  const [editingTask, setEditingTask] = useState(null);
  
  const [activeTab, setActiveTab] = useState('tasks');

  // Load from local storage and Supabase
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
      checkOverdueTasks(tasksData, currentUser);
    }

    // Fetch Inventory
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', currentUser.name);
    if (invData) setInventory(invData.map(i => i.item_id));
  };

  const checkOverdueTasks = async (currentTasks, currentUser) => {
    const now = new Date();
    let hpPenalty = 0;
    const tasksToPenalty = [];

    const updatedTasks = currentTasks.map(task => {
      if (!task.completed && !task.penalty_applied && task.deadline) {
        const taskDeadline = new Date(task.deadline);
        if (now > taskDeadline) {
          hpPenalty += 10;
          tasksToPenalty.push(task.id);
          return { ...task, penalty_applied: true };
        }
      }
      return task;
    });

    if (hpPenalty > 0) {
      setTasks(updatedTasks);
      
      // Update Database tasks
      for (const id of tasksToPenalty) {
        await supabase.from('tasks').update({ penalty_applied: true }).eq('id', id);
      }

      // Update User HP
      let newHp = (currentUser.hp || 100) - hpPenalty;
      let newLevel = currentUser.level || 1;
      let alertMsg = `Bạn bị trừ ${hpPenalty} HP do có ${tasksToPenalty.length} task quá hạn!`;

      if (newHp <= 0) {
        newHp = 100;
        newLevel = Math.max(1, newLevel - 1);
        alertMsg += `\n💀 Nhân vật đã kiệt sức. Bạn bị giáng xuống Cấp độ ${newLevel}.`;
      }

      const { data: updatedProfile } = await supabase
        .from('profiles')
        .update({ hp: newHp, level: newLevel })
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

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    const taskData = {
      text: newTask,
      difficulty,
      tag,
      deadline: deadline ? new Date(deadline).toISOString() : null
    };

    if (editingTask) {
      const { data } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.id)
        .select()
        .single();
        
      if (data) setTasks(tasks.map(t => t.id === editingTask.id ? data : t));
      setEditingTask(null);
    } else {
      const { data } = await supabase
        .from('tasks')
        .insert([{ user_id: user.name, ...taskData }])
        .select()
        .single();
      
      if (data) setTasks([data, ...tasks]);
    }
    setNewTask('');
    setDeadline('');
  };

  const toggleTask = async (task) => {
    const newCompleted = !task.completed;
    const { data } = await supabase
      .from('tasks')
      .update({ completed: newCompleted })
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

  const editTask = (task) => {
    setEditingTask(task);
    setNewTask(task.text);
    setDifficulty(task.difficulty);
    setTag(task.tag);
    if (task.deadline) {
      // Convert to local datetime format for input (YYYY-MM-DDThh:mm)
      const d = new Date(task.deadline);
      const localFormat = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
      setDeadline(localFormat);
    } else {
      setDeadline('');
    }
    setActiveTab('tasks');
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
    if (user.gold < item.price) {
      alert("Không đủ Vàng!");
      return;
    }
    
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
        alert(`Đã mua ${item.name}!`);
      }
    }
  };

  const equipItem = async (item) => {
    if (item.consumable) return;
    await updateUserProfile({ equipped_item: item.id });
    alert(`Đã trang bị ${item.name}!`);
  };

  const getDifficultyColor = (diff) => {
    switch (diff) {
      case 'Dễ': return 'text-gameEasy border-gameEasy';
      case 'Vừa': return 'text-gameMedium border-gameMedium';
      case 'Khó': return 'text-gameHard border-gameHard';
      default: return 'text-gameMedium border-gameMedium';
    }
  };

  const getTagIcon = (t) => {
    switch (t) {
      case 'Học tập': return <BookOpen size={14} className="mr-1" />;
      case 'Sức khỏe': return <Dumbbell size={14} className="mr-1" />;
      case 'Công việc': return <Briefcase size={14} className="mr-1" />;
      default: return <Sword size={14} className="mr-1" />;
    }
  };
  
  const formatDeadlineDisplay = (dateString) => {
    const d = new Date(dateString);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
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
              Quest Log
            </h1>
            <p className="text-gameText opacity-70 mt-2">Đăng nhập để kết nối server</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium">Tên anh hùng</label>
              <input 
                type="text" 
                name="username"
                className="input-field" 
                placeholder="Nhập tên nhân vật của bạn..."
                required 
              />
            </div>
            <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2 text-lg py-3">
              <Shield size={20} /> Bắt đầu cuộc phiêu lưu
            </button>
          </form>
        </div>
      </div>
    );
  }

  const expPercentage = Math.min((user.exp / (user.level * 100)) * 100, 100);
  const equippedItemDetails = ITEMS_DB.find(i => i.id === user.equipped_item);
  const EquippedIcon = equippedItemDetails ? equippedItemDetails.icon : null;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header Profile */}
      <header className="mb-8 game-card flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
        {/* Low HP Warning Glow */}
        {user.hp <= 30 && (
           <div className="absolute inset-0 bg-red-600 opacity-10 animate-pulse pointer-events-none rounded-lg"></div>
        )}
        <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
          <div className="w-16 h-16 bg-gameSecondary rounded-full flex items-center justify-center border-2 border-gamePrimary shadow-[0_0_15px_rgba(233,69,96,0.5)] relative">
            <span className="font-rpg text-2xl text-gamePrimary">{user.name.charAt(0).toUpperCase()}</span>
            {EquippedIcon && (
              <div className={`absolute -bottom-2 -right-2 bg-gameCard p-1.5 rounded-full border border-gamePrimary ${equippedItemDetails.color}`}>
                <EquippedIcon size={16} />
              </div>
            )}
          </div>
          <div className="flex-grow">
            <h2 className="font-bold text-2xl mb-1">{user.name}</h2>
            <div className="flex gap-4 text-sm font-bold">
              <span className="text-gameGold font-rpg flex items-center gap-1">🪙 {user.gold}</span>
              <span className={`font-rpg flex items-center gap-1 ${user.hp <= 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>❤️ {user.hp || 100}/100</span>
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-1/3 flex flex-col gap-1 z-10">
          <div className="flex justify-between font-rpg text-xs">
            <span className="text-gameExp">LVL {user.level}</span>
            <span>{user.exp} / {user.level * 100} EXP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 border border-gameSecondary">
            <div className="bg-gameExp h-2.5 rounded-full" style={{ width: `${expPercentage}%` }}></div>
          </div>
        </div>
        
        <button onClick={handleLogout} className="text-gameText hover:text-gamePrimary transition-colors absolute top-4 right-4 md:static z-10">
          <LogOut size={24} />
        </button>
      </header>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gameSecondary pb-2">
        <button 
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-colors ${activeTab === 'tasks' ? 'bg-gamePrimary text-white' : 'text-gameText hover:bg-gameSecondary'}`}
        >
          <BookOpen size={18} /> Nhiệm vụ
        </button>
        <button 
          onClick={() => setActiveTab('shop')}
          className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-colors ${activeTab === 'shop' ? 'bg-gamePrimary text-white' : 'text-gameText hover:bg-gameSecondary'}`}
        >
          <ShoppingBag size={18} /> Cửa hàng
        </button>
        <button 
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded flex gap-2 items-center font-bold transition-colors ${activeTab === 'inventory' ? 'bg-gamePrimary text-white' : 'text-gameText hover:bg-gameSecondary'}`}
        >
          <Backpack size={18} /> Túi đồ
        </button>
      </div>

      {activeTab === 'tasks' && (
        <>
          {/* Task Input */}
          <div className="game-card mb-8">
            <form onSubmit={addTask} className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <input 
                  type="text" 
                  value={newTask}
                  onChange={(e) => setNewTask(e.target.value)}
                  className="input-field flex-grow"
                  placeholder="Nhiệm vụ cần làm (Quest)..."
                />
                <input 
                  type="datetime-local" 
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input-field w-auto"
                  title="Deadline (Không bắt buộc)"
                />
              </div>
              <div className="flex gap-2">
                <select 
                  value={difficulty} 
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="input-field w-auto cursor-pointer"
                >
                  <option value="Dễ">Dễ</option>
                  <option value="Vừa">Vừa</option>
                  <option value="Khó">Khó</option>
                </select>
                <select 
                  value={tag} 
                  onChange={(e) => setTag(e.target.value)}
                  className="input-field w-auto cursor-pointer"
                >
                  <option value="Học tập">Học tập</option>
                  <option value="Sức khỏe">Sức khỏe</option>
                  <option value="Công việc">Công việc</option>
                </select>
              </div>
              <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
                {editingTask ? <Edit2 size={18} /> : <Plus size={18} />}
                {editingTask ? 'Cập nhật nhiệm vụ' : 'Nhận nhiệm vụ mới'}
              </button>
            </form>
          </div>

          {/* Task List */}
          <div className="space-y-4">
            <h3 className="font-rpg text-gamePrimary mb-4">Danh sách nhiệm vụ</h3>
            {tasks.length === 0 ? (
              <div className="text-center py-12 game-card border-dashed">
                <p className="text-gameText opacity-50">Bạn chưa có Quest nào. Hãy thêm để cày level!</p>
              </div>
            ) : (
              tasks.map(task => {
                let isOverdue = false;
                if (task.deadline && !task.completed) {
                  isOverdue = new Date() > new Date(task.deadline);
                }
                
                return (
                  <div 
                    key={task.id} 
                    className={`game-card flex flex-col md:flex-row items-start md:items-center justify-between group transition-all duration-300 gap-4 ${task.completed ? 'opacity-60 grayscale' : 'hover:scale-[1.01]'} ${isOverdue ? 'border-red-500 shadow-[0_0_10px_rgba(255,0,0,0.2)]' : ''}`}
                  >
                    <div className="flex items-start md:items-center gap-4 flex-grow w-full">
                      <button 
                        onClick={() => toggleTask(task)}
                        className={`mt-1 md:mt-0 min-w-6 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                          task.completed 
                            ? 'bg-gameExp border-gameExp text-white' 
                            : 'border-gameSecondary hover:border-gamePrimary'
                        }`}
                      >
                        {task.completed && <Check size={16} />}
                      </button>
                      <div className="flex-grow">
                        <p className={`font-medium text-lg ${task.completed ? 'line-through' : ''}`}>
                          {task.text}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(task.difficulty)}`}>
                            {task.difficulty}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-gameSecondary text-gameText flex items-center">
                            {getTagIcon(task.tag)} {task.tag}
                          </span>
                          {task.deadline && (
                            <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-gameSecondary text-gray-300'}`}>
                              <Clock size={12} />
                              {formatDeadlineDisplay(task.deadline)}
                              {isOverdue && ' (Quá hạn)'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-auto opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => editTask(task)}
                        className="p-2 text-gameEasy hover:bg-gameSecondary rounded transition-colors"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteTask(task.id)}
                        className="p-2 text-gamePrimary hover:bg-gameSecondary rounded transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {activeTab === 'shop' && (
        <div>
          <h3 className="font-rpg text-gameGold mb-4 flex items-center gap-2">
            <ShoppingBag /> Cửa hàng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ITEMS_DB.map(item => {
              const ItemIcon = item.icon;
              const hasItem = inventory.includes(item.id) && !item.consumable;
              return (
                <div key={item.id} className="game-card flex gap-4 items-center">
                  <div className={`p-4 rounded-lg bg-gameSecondary border border-gamePrimary ${item.color}`}>
                    <ItemIcon size={32} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-bold text-lg">{item.name}</h4>
                    <p className="text-sm opacity-70 mb-2">{item.desc}</p>
                    {hasItem ? (
                      <span className="text-gameEasy text-sm font-bold">Đã sở hữu</span>
                    ) : (
                      <button 
                        onClick={() => buyItem(item)}
                        className={`text-sm font-bold px-3 py-1 rounded transition-colors ${
                          user.gold >= item.price 
                            ? 'bg-gameGold text-black hover:bg-yellow-500' 
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Mua ({item.price} 🪙)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <h3 className="font-rpg text-gameEasy mb-4 flex items-center gap-2">
            <Backpack /> Túi đồ
          </h3>
          {inventory.length === 0 ? (
            <div className="text-center py-12 game-card border-dashed">
              <p className="text-gameText opacity-50">Túi đồ trống rỗng. Hãy ghé Cửa hàng nhé!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from(new Set(inventory)).map(itemId => {
                const item = ITEMS_DB.find(i => i.id === itemId);
                if (!item) return null;
                const ItemIcon = item.icon;
                const isEquipped = user.equipped_item === item.id;
                
                return (
                  <div key={item.id} className={`game-card flex gap-4 items-center ${isEquipped ? 'border-gameEasy shadow-[0_0_10px_rgba(0,168,255,0.3)]' : ''}`}>
                    <div className={`p-4 rounded-lg bg-gameSecondary border ${isEquipped ? 'border-gameEasy' : 'border-gameCard'} ${item.color}`}>
                      <ItemIcon size={32} />
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-bold text-lg">{item.name}</h4>
                      {isEquipped ? (
                        <span className="text-gameEasy text-sm font-bold block mt-2">✨ Đang trang bị</span>
                      ) : (
                        <button 
                          onClick={() => equipItem(item)}
                          className="text-sm font-bold px-3 py-1 rounded bg-gamePrimary text-white hover:bg-red-500 transition-colors mt-2"
                        >
                          Trang bị
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
