import { LogOut } from 'lucide-react';
import { ITEMS_DB } from '../data/items';

export default function SidebarProfile({ user, handleLogout }) {
  const expPercentage = Math.min((user.exp / (user.level * 100)) * 100, 100);
  const equippedItemDetails = ITEMS_DB.find(i => i.id === user.equipped_item);
  const EquippedIcon = equippedItemDetails ? equippedItemDetails.icon : null;

  return (
    <div className="game-card h-full flex flex-col relative overflow-hidden">
      {/* Low HP Warning Glow */}
      {user.hp <= 30 && (
         <div className="absolute inset-0 bg-red-600 opacity-10 animate-pulse pointer-events-none rounded-lg"></div>
      )}
      
      <div className="flex flex-col items-center gap-4 relative z-10 mb-6">
        <div className="w-24 h-24 bg-gameSecondary rounded-full flex items-center justify-center border-4 border-gamePrimary shadow-[0_0_15px_rgba(233,69,96,0.5)] relative">
          <span className="font-rpg text-4xl text-gamePrimary">{user.name.charAt(0).toUpperCase()}</span>
          {EquippedIcon && (
            <div className={`absolute -bottom-2 -right-2 bg-gameCard p-2 rounded-full border-2 border-gamePrimary ${equippedItemDetails.color}`}>
              <EquippedIcon size={20} />
            </div>
          )}
        </div>
        <div className="text-center">
          <h2 className="font-bold text-2xl mb-1">{user.name}</h2>
          <span className="text-sm px-2 py-1 rounded bg-gameSecondary border border-gamePrimary text-gameGold">
            Chuỗi: {user.streak || 0} ngày 🔥
          </span>
        </div>
      </div>
      
      <div className="space-y-4 z-10 flex-grow">
        <div className="bg-gameSecondary p-3 rounded border border-gray-700">
          <div className="flex justify-between font-rpg text-sm mb-1">
            <span className="text-gameExp">LVL {user.level}</span>
            <span>{user.exp} / {user.level * 100} EXP</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3">
            <div className="bg-gameExp h-3 rounded-full" style={{ width: `${expPercentage}%` }}></div>
          </div>
        </div>

        <div className="flex justify-between items-center bg-gameSecondary p-3 rounded border border-gray-700">
          <span className="font-bold">Sinh lực (HP)</span>
          <span className={`font-rpg flex items-center gap-1 ${user.hp <= 30 ? 'text-red-500 animate-pulse' : 'text-green-400'}`}>
            ❤️ {user.hp || 100}/100
          </span>
        </div>

        <div className="flex justify-between items-center bg-gameSecondary p-3 rounded border border-gray-700">
          <span className="font-bold">Tài sản</span>
          <span className="text-gameGold font-rpg flex items-center gap-1">🪙 {user.gold}</span>
        </div>
      </div>
      
      <button 
        onClick={handleLogout} 
        className="mt-6 flex items-center justify-center gap-2 w-full py-2 bg-gray-800 hover:bg-red-900 text-white rounded transition-colors z-10"
      >
        <LogOut size={18} /> Đăng xuất
      </button>
    </div>
  );
}
