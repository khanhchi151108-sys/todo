import { LogOut, Sparkles, Mail } from 'lucide-react';
import { ITEMS_DB } from '../data/items';

export default function SidebarProfile({ user, handleLogout }) {
  const expPercentage = Math.min(((user.exp || 0) / ((user.level || 1) * 100)) * 100, 100);
  const equippedItemDetails = ITEMS_DB.find(i => i.id === user.equipped_item);
  const EquippedIcon = equippedItemDetails ? equippedItemDetails.icon : null;

  return (
    <div className="game-card h-full flex flex-col relative overflow-hidden">
      {/* Low HP Warning Glow */}
      {(user.hp || 100) <= 30 && (
         <div className="absolute inset-0 bg-red-600 opacity-10 animate-pulse pointer-events-none rounded-lg"></div>
      )}
      
      {/* Double XP Indicator */}
      {user.double_xp && (
        <div className="absolute top-2 left-2 flex items-center gap-1 text-xs font-bold text-green-400 bg-green-900/40 px-2 py-1 rounded border border-green-500 animate-pulse">
          <Sparkles size={12} /> x2 XP
        </div>
      )}

      <div className="flex flex-col items-center gap-3 relative z-10 mb-2 mt-2">
        <div className={`w-20 h-20 sm:w-24 sm:h-24 bg-gameSecondary rounded-full flex items-center justify-center border-4 relative transition-all duration-300 ${user.border || 'border-gamePrimary shadow-[0_0_15px_rgba(233,69,96,0.5)]'}`}>
          <span className="font-rpg text-3xl sm:text-4xl text-gamePrimary">
            {user.name ? user.name.charAt(0).toUpperCase() : 'H'}
          </span>
          {EquippedIcon && (
            <div className={`absolute -bottom-2 -right-2 bg-gameCard p-1.5 sm:p-2 rounded-full border-2 border-gamePrimary ${equippedItemDetails.color}`}>
              <EquippedIcon size={18} />
            </div>
          )}
        </div>

        <div className="text-center w-full px-2">
          {user.title && (
            <span className="text-[10px] uppercase font-bold text-yellow-400 tracking-widest block mb-1">
              &lt; {user.title} &gt;
            </span>
          )}
          <h2 className="font-bold text-xl sm:text-2xl truncate">{user.name}</h2>
          {user.email && (
            <div className="flex items-center justify-center gap-1 text-[11px] text-gray-400 mt-0.5 truncate">
              <Mail size={12} className="shrink-0" />
              <span className="truncate max-w-[180px]">{user.email}</span>
            </div>
          )}
          <div className="flex gap-2 justify-center mt-2 flex-wrap">
            <span className="text-xs px-2 py-1 rounded bg-gameSecondary border border-gamePrimary text-gameGold">
              Chuỗi: {user.streak || 0} ngày 🔥
            </span>
            {user.frozen_days > 0 && (
              <span className="text-xs px-2 py-1 rounded bg-cyan-900/50 border border-cyan-500 text-cyan-400">
                Băng: {user.frozen_days} ❄️
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="space-y-3 z-10 flex-grow mt-3">
        <div className="bg-gameSecondary p-3 rounded-lg border border-gray-700">
          <div className="flex justify-between font-rpg text-xs mb-1.5">
            <span className="text-gameExp">LVL {user.level || 1}</span>
            <span>{user.exp || 0} / {(user.level || 1) * 100} EXP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2.5 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-gameExp h-full rounded-full transition-all duration-300" style={{ width: `${expPercentage}%` }}></div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-gameSecondary p-3 rounded-lg border border-gray-700">
          <span className="font-bold text-sm">Sinh lực (HP)</span>
          <span className={`font-rpg text-sm flex items-center gap-1 ${(user.hp || 100) <= 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            ❤️ {user.hp || 100}/100
          </span>
        </div>

        <div className="flex justify-between items-center bg-gameSecondary p-3 rounded-lg border border-gray-700">
          <span className="font-bold text-sm">Tài sản</span>
          <span className="text-gameGold font-rpg text-sm flex items-center gap-1">🪙 {user.gold || 0}</span>
        </div>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-gray-800 hover:bg-red-950/80 hover:border-red-600 border border-gray-700 text-white text-xs font-bold rounded-lg transition-all z-10"
      >
        <LogOut size={16} /> Đăng xuất
      </button>
    </div>
  );
}
