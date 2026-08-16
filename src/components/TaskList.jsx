import { useState } from 'react';
import { Check, Plus, Trash2, Edit2, Sword, BookOpen, Dumbbell, Briefcase, Clock, AlertTriangle } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function TaskList({ tasks, addTask, toggleTask, deleteTask, editTask, activeTab }) {
  const [newTask, setNewTask] = useState('');
  const [difficulty, setDifficulty] = useState('Vừa');
  const [tag, setTag] = useState('Học tập');
  const [deadline, setDeadline] = useState('');
  const [editingTask, setEditingTask] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    addTask({
      id: editingTask?.id,
      text: newTask,
      difficulty,
      tag,
      deadline,
      type: 'one-time'
    });
    
    setNewTask('');
    setDeadline('');
    setEditingTask(null);
  };

  const startEdit = (task) => {
    setEditingTask(task);
    setNewTask(task.text);
    setDifficulty(task.difficulty);
    setTag(task.tag);
    if (task.deadline) {
      const d = new Date(task.deadline);
      const localFormat = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0,16);
      setDeadline(localFormat);
    } else {
      setDeadline('');
    }
  };

  const handleToggle = (task) => {
    if (!task.completed) {
      // Dopamine hit
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#e94560', '#ffd700', '#00a8ff']
      });
    }
    toggleTask(task);
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
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()}/${d.getMonth()+1}`;
  };

  // Sort and Categorize Tasks
  const now = new Date();
  
  const activeTasks = tasks.filter(t => t.status !== 'history' && !t.completed);
  const historyTasks = tasks.filter(t => t.status === 'history' || t.completed);

  // Categorize active tasks
  const categorizedTasks = activeTasks.map(task => {
    let urgency = 'green'; // > 48h or none
    let isOverdue = false;
    
    if (task.deadline) {
      const taskDate = new Date(task.deadline);
      const diffHours = (taskDate - now) / (1000 * 60 * 60);
      
      if (diffHours < 0) {
        urgency = 'red';
        isOverdue = true;
      } else if (diffHours <= 24) {
        urgency = 'red';
      } else if (diffHours <= 48) {
        urgency = 'orange';
      }
    }
    return { ...task, urgency, isOverdue };
  });

  // Sort: Red first, then Orange, then Green
  const sortedActiveTasks = categorizedTasks.sort((a, b) => {
    const rank = { red: 1, orange: 2, green: 3 };
    return rank[a.urgency] - rank[b.urgency];
  });

  const displayTasks = activeTab === 'tasks' ? sortedActiveTasks : historyTasks;

  return (
    <div className="flex flex-col h-full">
      {activeTab === 'tasks' && (
        <div className="game-card mb-6 shrink-0">
          <form onSubmit={handleSubmit} className="space-y-4">
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
              />
            </div>
            <div className="flex gap-2">
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input-field w-auto cursor-pointer">
                <option value="Dễ">Dễ</option>
                <option value="Vừa">Vừa</option>
                <option value="Khó">Khó</option>
              </select>
              <select value={tag} onChange={(e) => setTag(e.target.value)} className="input-field w-auto cursor-pointer">
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
      )}

      <div className="flex-grow overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {displayTasks.length === 0 ? (
          <div className="text-center py-12 game-card border-dashed">
            <p className="text-gameText opacity-50">
              {activeTab === 'tasks' ? 'Không có nhiệm vụ nào. Tận hưởng ngày nghỉ nhé!' : 'Lịch sử trống rỗng.'}
            </p>
          </div>
        ) : (
          displayTasks.map(task => {
            const urgencyColor = {
              red: 'border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]',
              orange: 'border-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.2)]',
              green: 'border-gameCard'
            };
            
            const cardClass = activeTab === 'tasks' 
              ? `game-card flex flex-col sm:flex-row sm:items-center gap-3 transition-transform hover:-translate-y-1 ${urgencyColor[task.urgency]} ${task.isOverdue ? 'bg-red-950/20' : ''}`
              : `game-card flex items-center opacity-60 grayscale gap-3`;

            return (
              <div key={task.id} className={cardClass}>
                <button 
                  onClick={() => handleToggle(task)}
                  disabled={activeTab === 'history'}
                  className={`shrink-0 w-6 h-6 rounded flex items-center justify-center border-2 transition-colors ${
                    task.completed 
                      ? 'bg-gameExp border-gameExp text-white' 
                      : 'border-gameSecondary hover:border-gamePrimary'
                  }`}
                >
                  {task.completed && <Check size={16} />}
                </button>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {task.urgency === 'red' && !task.completed && <AlertTriangle size={16} className="text-red-500 shrink-0 animate-pulse" />}
                    <p className={`font-medium truncate ${task.completed ? 'line-through' : ''}`}>
                      {task.text}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getDifficultyColor(task.difficulty)}`}>
                      {task.difficulty}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gameSecondary text-gameText flex items-center">
                      {getTagIcon(task.tag)} {task.tag}
                    </span>
                    {task.deadline && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1 ${task.isOverdue ? 'bg-red-500/20 text-red-400 border border-red-500' : 'bg-gameSecondary text-gray-400'}`}>
                        <Clock size={10} />
                        {formatDeadlineDisplay(task.deadline)}
                        {task.isOverdue && ' (Quá hạn)'}
                      </span>
                    )}
                  </div>
                </div>
                
                {activeTab === 'tasks' && (
                  <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-2 sm:mt-0">
                    <button onClick={() => startEdit(task)} className="p-1.5 text-gameEasy hover:bg-gameSecondary rounded">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-gamePrimary hover:bg-gameSecondary rounded">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
