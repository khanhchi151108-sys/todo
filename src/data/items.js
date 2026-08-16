import { Sword, Shield, Sparkles, Heart, Snowflake, Timer, Ticket } from 'lucide-react';

export const ITEMS_DB = [
  // Trang bị
  { id: 'wooden_sword', name: 'Kiếm Gỗ', price: 50, icon: Sword, color: 'text-yellow-600', desc: 'Vũ khí cơ bản cho người mới bắt đầu.' },
  { id: 'iron_shield', name: 'Khiên Sắt', price: 100, icon: Shield, color: 'text-gray-400', desc: 'Tăng cường sức chịu đựng.' },
  { id: 'magic_cloak', name: 'Áo Choàng Phép', price: 300, icon: Sparkles, color: 'text-purple-500', desc: 'Ánh sáng lấp lánh kỳ bí.' },
  
  // Vật phẩm chức năng (Tiêu hao)
  { id: 'health_potion', name: 'Bình Máu', price: 50, icon: Heart, color: 'text-red-500', desc: 'Hồi 20 HP ngay lập tức.', consumable: true },
  { id: 'streak_freeze', name: 'Bình Đóng Băng', price: 150, icon: Snowflake, color: 'text-cyan-400', desc: 'Giữ nguyên Chuỗi (Streak) trong 1 ngày nếu lỡ quên làm nhiệm vụ.', consumable: true },
  { id: 'focus_potion', name: 'Thuốc Tập Trung', price: 200, icon: Timer, color: 'text-green-500', desc: 'Bật đồng hồ Pomodoro. Hoàn thành để x2 XP cho Task tiếp theo.', consumable: true },
  { id: 'gacha_ticket', name: 'Vé Quay Gacha', price: 500, icon: Ticket, color: 'text-pink-500', desc: 'Sử dụng để quay Danh hiệu hoặc Viền Avatar quý hiếm.', consumable: true },
];

export const GACHA_POOL = {
  titles: [
    { id: 'title_1', name: 'Tân Binh', rarity: 'common' },
    { id: 'title_2', name: 'Kẻ Săn Goblin', rarity: 'uncommon' },
    { id: 'title_3', name: 'Kỵ Sĩ Bóng Đêm', rarity: 'rare' },
    { id: 'title_4', name: 'Kẻ Diệt Rồng', rarity: 'epic' },
    { id: 'title_5', name: 'Vua Lười Biếng', rarity: 'legendary' }
  ],
  borders: [
    { id: 'border_1', class: 'border-white', rarity: 'common' },
    { id: 'border_2', class: 'border-green-400 shadow-[0_0_10px_#4ade80]', rarity: 'uncommon' },
    { id: 'border_3', class: 'border-blue-500 shadow-[0_0_15px_#3b82f6]', rarity: 'rare' },
    { id: 'border_4', class: 'border-purple-500 shadow-[0_0_20px_#a855f7]', rarity: 'epic' },
    { id: 'border_5', class: 'border-yellow-400 shadow-[0_0_25px_#facc15] animate-pulse', rarity: 'legendary' }
  ]
};
