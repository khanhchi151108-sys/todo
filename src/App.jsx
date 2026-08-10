import { useState, useEffect } from 'react';
import { Check, Plus, Trash2, Edit2, LogOut, Sword, Shield, BookOpen, Dumbbell, Briefcase } from 'lucide-react';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [difficulty, setDifficulty] = useState('Vừa');
  const [tag, setTag] = useState('Học tập');
  const [editingTask, setEditingTask] = useState(null);

  // Load from local storage and Supabase
  useEffect(() => {
    const savedUser = localStorage.getItem('rpg_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchTasks(parsedUser.name);
    }
  }, []);

  const fetchTasks = async (username) => {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', username)
      .order('created_at', { ascending: false });
    
    if (data) setTasks(data);
  };

  const syncProfile = async (username) => {
    // Check if profile exists
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
      fetchTasks(username);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTasks([]);
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
    const nextLevelExp = currentLevel * 100; // simple scale
    if (currentExp >= nextLevelExp) {
      alert(`🎉 Chúc mừng! Bạn đã đạt Cấp độ ${currentLevel + 1}!`);
      return currentLevel + 1;
    }
    return currentLevel;
  };

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    if (editingTask) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ text: newTask, difficulty, tag })
        .eq('id', editingTask.id)
        .select()
        .single();
        
      if (data) {
        setTasks(tasks.map(t => t.id === editingTask.id ? data : t));
      }
      setEditingTask(null);
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ user_id: user.name, text: newTask, difficulty, tag }])
        .select()
        .single();
      
      if (data) {
        setTasks([data, ...tasks]);
      }
    }
    setNewTask('');
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
      
      // RPG Mechanics: Give rewards if completed
      if (newCompleted) {
        const reward = calculateReward(task.difficulty);
        let newExp = user.exp + reward.exp;
        let newGold = user.gold + reward.gold;
        let newLevel = await handleLevelUp(newExp, user.level);
        
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update({ exp: newExp, gold: newGold, level: newLevel })
          .eq('username', user.name)
          .select()
          .single();
          
        if (updatedProfile) {
          const newUser = { ...user, ...updatedProfile };
          setUser(newUser);
          localStorage.setItem('rpg_user', JSON.stringify(newUser));
        }
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

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      {/* Header Profile */}
      <header className="mb-8 game-card flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-16 h-16 bg-gameSecondary rounded-full flex items-center justify-center border-2 border-gamePrimary shadow-[0_0_15px_rgba(233,69,96,0.5)]">
            <span className="font-rpg text-2xl text-gamePrimary">{user.name.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-grow">
            <h2 className="font-bold text-2xl mb-1">{user.name}</h2>
            <div className="flex gap-4 text-sm font-bold">
              <span className="text-gameGold font-rpg">🪙 {user.gold}</span>
              <span className="text-red-500 font-rpg">❤️ {user.hp}/100</span>
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-1/3 flex flex-col gap-1">
          <div className="flex justify-between font-rpg text-xs">
            <span className="text-gameExp">LVL {user.level}</span>
            <span>{user.exp} / {user.level * 100} EXP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 border border-gameSecondary">
            <div className="bg-gameExp h-2.5 rounded-full" style={{ width: `${expPercentage}%` }}></div>
          </div>
        </div>
        
        <button onClick={handleLogout} className="text-gameText hover:text-gamePrimary transition-colors absolute top-4 right-4 md:static">
          <LogOut size={24} />
        </button>
      </header>

      {/* Task Input */}
      <div className="game-card mb-8">
        <form onSubmit={addTask} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="text" 
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="input-field flex-grow"
              placeholder="Thêm nhiệm vụ mới..."
            />
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
          </div>
          <button type="submit" className="btn-primary w-full flex justify-center items-center gap-2">
            {editingTask ? <Edit2 size={18} /> : <Plus size={18} />}
            {editingTask ? 'Cập nhật nhiệm vụ' : 'Thêm nhiệm vụ'}
          </button>
        </form>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        <h3 className="font-rpg text-gamePrimary mb-4">Danh sách nhiệm vụ</h3>
        {tasks.length === 0 ? (
          <div className="text-center py-12 game-card border-dashed">
            <p className="text-gameText opacity-50">Chưa có nhiệm vụ nào. Hãy nhận quest mới!</p>
          </div>
        ) : (
          tasks.map(task => (
            <div 
              key={task.id} 
              className={`game-card flex items-center justify-between group transition-all duration-300 ${task.completed ? 'opacity-60 grayscale' : 'hover:scale-[1.01]'}`}
            >
              <div className="flex items-center gap-4 flex-grow">
                <button 
                  onClick={() => toggleTask(task)}
                  className={`w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
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
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded border ${getDifficultyColor(task.difficulty)}`}>
                      {task.difficulty}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gameSecondary text-gameText flex items-center">
                      {getTagIcon(task.tag)} {task.tag}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
          ))
        )}
      </div>
    </div>
  );
}
