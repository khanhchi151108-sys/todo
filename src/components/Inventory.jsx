import { Backpack } from 'lucide-react';
import { ITEMS_DB } from '../data/items';

export default function Inventory({ user, inventory, equipItem }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <h3 className="font-rpg text-gameEasy mb-4 flex items-center gap-2 shrink-0">
        <Backpack /> Túi đồ
      </h3>
      
      <div className="overflow-y-auto pr-2 custom-scrollbar">
        {inventory.length === 0 ? (
          <div className="text-center py-12 game-card border-dashed">
            <p className="text-gameText opacity-50">Túi đồ trống rỗng. Hãy ghé Cửa hàng nhé!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {Array.from(new Set(inventory)).map(itemId => {
              const item = ITEMS_DB.find(i => i.id === itemId);
              if (!item) return null;
              const ItemIcon = item.icon;
              const isEquipped = user.equipped_item === item.id;
              
              return (
                <div key={item.id} className={`game-card flex gap-4 items-center ${isEquipped ? 'border-gameEasy shadow-[0_0_10px_rgba(0,168,255,0.3)]' : ''}`}>
                  <div className={`shrink-0 p-3 rounded-lg bg-gameSecondary border ${isEquipped ? 'border-gameEasy' : 'border-gameCard'} ${item.color}`}>
                    <ItemIcon size={24} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold truncate">{item.name}</h4>
                    {isEquipped ? (
                      <span className="text-gameEasy text-xs font-bold block mt-1">✨ Đang trang bị</span>
                    ) : (
                      <button 
                        onClick={() => equipItem(item)}
                        className="text-xs font-bold px-3 py-1 rounded bg-gamePrimary text-white hover:bg-red-500 transition-colors mt-1"
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
    </div>
  );
}
