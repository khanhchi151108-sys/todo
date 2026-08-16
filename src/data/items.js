import { Sword, Shield, Sparkles, Heart } from 'lucide-react';

export const ITEMS_DB = [
  { id: 'wooden_sword', name: 'Kiếm Gỗ', price: 50, icon: Sword, color: 'text-yellow-600', desc: 'Vũ khí cơ bản cho người mới bắt đầu.' },
  { id: 'iron_shield', name: 'Khiên Sắt', price: 100, icon: Shield, color: 'text-gray-400', desc: 'Tăng cường sức chịu đựng.' },
  { id: 'magic_cloak', name: 'Áo Choàng Phép', price: 300, icon: Sparkles, color: 'text-purple-500', desc: 'Ánh sáng lấp lánh kỳ bí.' },
  { id: 'health_potion', name: 'Bình Máu', price: 50, icon: Heart, color: 'text-red-500', desc: 'Hồi 20 HP ngay lập tức.', consumable: true },
];
