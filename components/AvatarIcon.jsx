import React from 'react';
import { 
  Smile, User, Ghost, Zap, Star, Heart, 
  Flame, Sparkles, Crown, Rocket, Compass, 
  Coffee, Headphones, Gamepad2, Shield, Cat, 
  Sun, Moon, Terminal, Target, Award, Feather 
} from 'lucide-react';

export default function AvatarIcon({ name, size = 24, className = "" }) {
  switch (name) {
    case 'smile': return <Smile size={size} className={className} />;
    case 'ghost': return <Ghost size={size} className={className} />;
    case 'zap': return <Zap size={size} className={className} />;
    case 'star': return <Star size={size} className={className} />;
    case 'heart': return <Heart size={size} className={className} />;
    case 'flame': return <Flame size={size} className={className} />;
    case 'sparkles': return <Sparkles size={size} className={className} />;
    case 'crown': return <Crown size={size} className={className} />;
    case 'rocket': return <Rocket size={size} className={className} />;
    case 'compass': return <Compass size={size} className={className} />;
    case 'coffee': return <Coffee size={size} className={className} />;
    case 'headphones': return <Headphones size={size} className={className} />;
    case 'gamepad': return <Gamepad2 size={size} className={className} />;
    case 'shield': return <Shield size={size} className={className} />;
    case 'cat': return <Cat size={size} className={className} />;
    case 'sun': return <Sun size={size} className={className} />;
    case 'moon': return <Moon size={size} className={className} />;
    case 'terminal': return <Terminal size={size} className={className} />;
    case 'target': return <Target size={size} className={className} />;
    case 'award': return <Award size={size} className={className} />;
    case 'feather': return <Feather size={size} className={className} />;
    case 'user': 
    default:
      return <User size={size} className={className} />;
  }
}

export const AVATAR_OPTIONS = [
  'user', 'smile', 'ghost', 'zap', 'star', 'heart',
  'flame', 'sparkles', 'crown', 'rocket', 'compass',
  'coffee', 'headphones', 'gamepad', 'shield', 'cat',
  'sun', 'moon', 'terminal', 'target', 'award', 'feather'
];
