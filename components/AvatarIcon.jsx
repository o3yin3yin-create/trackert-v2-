import React from 'react';
import { 
  Smile, User, Ghost, Zap, Star, Heart, 
  Flame, Sparkles, Crown, Rocket, Compass, 
  Coffee, Headphones, Gamepad2, Shield, Cat, 
  Sun, Moon, Terminal, Target, Award, Feather,
  Bot, BookOpen, Code, Laptop, Palette, Globe,
  Dumbbell, Bike, Anchor, Music, Camera, Plane,
  Swords, Lightbulb, Radio, Clock, Eye, Atom,
  Glasses, Infinity as InfinityIcon, Cpu
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
    case 'bot': return <Bot size={size} className={className} />;
    case 'book': return <BookOpen size={size} className={className} />;
    case 'code': return <Code size={size} className={className} />;
    case 'laptop': return <Laptop size={size} className={className} />;
    case 'palette': return <Palette size={size} className={className} />;
    case 'globe': return <Globe size={size} className={className} />;
    case 'dumbbell': return <Dumbbell size={size} className={className} />;
    case 'bike': return <Bike size={size} className={className} />;
    case 'anchor': return <Anchor size={size} className={className} />;
    case 'music': return <Music size={size} className={className} />;
    case 'camera': return <Camera size={size} className={className} />;
    case 'plane': return <Plane size={size} className={className} />;
    case 'swords': return <Swords size={size} className={className} />;
    case 'lightbulb': return <Lightbulb size={size} className={className} />;
    case 'radio': return <Radio size={size} className={className} />;
    case 'clock': return <Clock size={size} className={className} />;
    case 'eye': return <Eye size={size} className={className} />;
    case 'atom': return <Atom size={size} className={className} />;
    case 'glasses': return <Glasses size={size} className={className} />;
    case 'infinity': return <InfinityIcon size={size} className={className} />;
    case 'cpu': return <Cpu size={size} className={className} />;
    case 'boy1':
    case 'boy2':
    case 'girl1':
    case 'girl2':
    case 'user': 
    default:
      return <User size={size} className={className} />;
  }
}

export const AVATAR_OPTIONS = [
  'user', 'smile', 'ghost', 'zap', 'star', 'heart',
  'flame', 'sparkles', 'crown', 'rocket', 'compass',
  'coffee', 'headphones', 'gamepad', 'shield', 'cat',
  'sun', 'moon', 'terminal', 'target', 'award', 'feather',
  'bot', 'book', 'code', 'laptop', 'palette', 'globe',
  'dumbbell', 'bike', 'anchor', 'music', 'camera', 'plane',
  'swords', 'lightbulb', 'radio', 'clock', 'eye', 'atom',
  'glasses', 'infinity', 'cpu'
];
