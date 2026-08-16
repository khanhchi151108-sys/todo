import { ShoppingBag } from 'lucide-react';
import { ITEMS_DB } from '../data/items';

export default function Shop({ user, inventory, buyItem }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <h3 className="font-rpg text-gameGold mb-4 flex items-center gap-2 shrink-0">
        <ShoppingBag /> Cửa hàng
      </h3>
      <div className="overflow-y-auto pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 gap-4">
          {ITEMS_DB.map(item => {
            const ItemIcon = item.icon;
            const hasItem = inventory.includes(item.id) && !item.consumable;
            return (
              <div key={item.id} className="game-card flex gap-4 items-center">
                <div className={`shrink-0 p-3 rounded-lg bg-gameSecondary border border-gamePrimary ${item.color}`}>
                  <ItemIcon size={24} />
                </div>
                <div className="flex-grow min-w-0">
                  <h4 className="font-bold truncate">{item.name}</h4>
                  <p className="text-xs opacity-70 mb-2 truncate">{item.desc}</p>
                  {hasItem ? (
                    <span className="text-gameEasy text-xs font-bold px-2 py-1 bg-gameSecondary rounded">Đã sở hữu</span>
                  ) : (
                    <button 
                      onClick={() => buyItem(item)}
                      disabled={user.gold < item.price}
                      className={`text-xs font-bold px-3 py-1 rounded transition-colors ${
                        user.gold >= item.price 
                          ? 'bg-gameGold text-black hover:bg-yellow-500' 
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'
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
    </div>
  );
}
