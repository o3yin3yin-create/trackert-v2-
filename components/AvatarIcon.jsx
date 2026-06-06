import React from 'react';
import { Smile, User, Ghost, Zap, Star, Heart } from 'lucide-react';

export default function AvatarIcon({ name, size = 24, className = "" }) {
  switch (name) {
    case 'smile': return <Smile size={size} className={className} />;
    case 'ghost': return <Ghost size={size} className={className} />;
    case 'zap': return <Zap size={size} className={className} />;
    case 'star': return <Star size={size} className={className} />;
    case 'heart': return <Heart size={size} className={className} />;
    case 'user': 
    default:
      return <User size={size} className={className} />;
  }
}

export const AVATAR_OPTIONS = ['user', 'smile', 'ghost', 'zap', 'star', 'heart'];
