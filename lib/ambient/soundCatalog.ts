/**
 * lib/ambient/soundCatalog.ts
 * Complete sound catalog for the Ambient Sound Library.
 * Adding a new sound is as simple as adding an object to SOUND_CATALOG.
 */

export type SoundCategory = 'noise' | 'nature' | 'places' | 'other';
export type SoundType = 'generated' | 'file';
export type NoiseType = 'white' | 'pink' | 'brown' | 'green';

export interface SoundItem {
  id: string;
  nameEn: string;
  nameAr: string;
  category: SoundCategory;
  type: SoundType;
  noiseType?: NoiseType;
  src?: string;
  icon: string;
  descriptionEn: string;
  descriptionAr: string;
  defaultVolume: number; // 0.0 to 1.0
  license: string;
  author?: string;
  sourceUrl?: string;
}

export interface SoundMixPreset {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  icon: string;
  isBuiltIn: boolean;
  sounds: { [soundId: string]: number }; // soundId -> volume (0.0 to 1.0)
}

export const SOUND_CATEGORIES: { id: SoundCategory | 'all'; nameEn: string; nameAr: string }[] = [
  { id: 'all', nameEn: 'All Sounds', nameAr: 'جميع الأصوات' },
  { id: 'noise', nameEn: 'Noise Generator', nameAr: 'مولد الضوضاء' },
  { id: 'nature', nameEn: 'Nature', nameAr: 'طبيعة' },
  { id: 'places', nameEn: 'Places', nameAr: 'أماكن' },
  { id: 'other', nameEn: 'Focus & Rhythm', nameAr: 'تركيز وإيقاع' },
];

export const SOUND_CATALOG: SoundItem[] = [
  // ---------------- NOISE (Procedurally generated in code) ----------------
  {
    id: 'white_noise',
    nameEn: 'White Noise',
    nameAr: 'ضوضاء بيضاء',
    category: 'noise',
    type: 'generated',
    noiseType: 'white',
    icon: 'Radio',
    descriptionEn: 'Uniform energy across all frequencies. Excellent for blocking sudden background chatter.',
    descriptionAr: 'طاقة متساوية عبر كافة الترددات، مثالية لعزل الأصوات والضوضاء المفاجئة.',
    defaultVolume: 0.45,
    license: 'Procedurally generated via Web Audio API (Code)',
  },
  {
    id: 'pink_noise',
    nameEn: 'Pink Noise',
    nameAr: 'ضوضاء وردية',
    category: 'noise',
    type: 'generated',
    noiseType: 'pink',
    icon: 'Activity',
    descriptionEn: 'Deeper than white noise with equal energy per octave. Mimics rainfall and gentle breezes.',
    descriptionAr: 'أعمق وأكثر نعومة من الضوضاء البيضاء، تحاكي صوت المطر والرياح الهادئة ومثالية للدراسة العميقة.',
    defaultVolume: 0.5,
    license: 'Procedurally generated via Paul Kellet filter (Web Audio API)',
  },
  {
    id: 'brown_noise',
    nameEn: 'Brown Noise',
    nameAr: 'ضوضاء بنية',
    category: 'noise',
    type: 'generated',
    noiseType: 'brown',
    icon: 'Waves',
    descriptionEn: 'Warm, rumbling bass frequencies. Closely mimics a distant waterfall or heavy surf.',
    descriptionAr: 'ترددات عميقة ودافئة تشبه صوت الشلال الهادر أو البحر البعيد، مريحة جداً للأعصاب.',
    defaultVolume: 0.55,
    license: 'Procedurally generated via leaky integrator (Web Audio API)',
  },
  {
    id: 'green_noise',
    nameEn: 'Green Noise',
    nameAr: 'ضوضاء خضراء',
    category: 'noise',
    type: 'generated',
    noiseType: 'green',
    icon: 'Leaf',
    descriptionEn: 'Mid-frequency noise centered at ~500 Hz. Calming ambient profile resembling natural outdoor ambience.',
    descriptionAr: 'ضوضاء مركزة على ترددات الطبيعة المتوسطة (~500 هرتز)، تمنح شعوراً بالسكينة والحضور الذهني.',
    defaultVolume: 0.45,
    license: 'Procedurally generated via band-pass filter (Web Audio API)',
  },

  // ---------------- NATURE (File-based loops) ----------------
  {
    id: 'rain',
    nameEn: 'Gentle Rain',
    nameAr: 'مطر خفيف',
    category: 'nature',
    type: 'file',
    src: '/sounds/rain.mp3',
    icon: 'CloudRain',
    descriptionEn: 'Soft droplets falling on leaves and pavement.',
    descriptionAr: 'قطرات مطر لطيفة تتساقط برقة وهدوء.',
    defaultVolume: 0.5,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'heavy_rain',
    nameEn: 'Heavy Rain',
    nameAr: 'مطر غزير',
    category: 'nature',
    type: 'file',
    src: '/sounds/heavy-rain.mp3',
    icon: 'CloudDrizzle',
    descriptionEn: 'Steady, deep rain shower with high immersion.',
    descriptionAr: 'هطول متواصل لزخات مطر غزيرة لعزل تام عن المحيط.',
    defaultVolume: 0.5,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'thunderstorm',
    nameEn: 'Soft Thunder',
    nameAr: 'رعد هادئ',
    category: 'nature',
    type: 'file',
    src: '/sounds/thunderstorm.mp3',
    icon: 'CloudLightning',
    descriptionEn: 'Distant, soothing thunder rolls paired with gentle rain.',
    descriptionAr: 'دوي رعد بعيد وغير مفاجئ مع أجواء ماطرة غامرة.',
    defaultVolume: 0.4,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'ocean_waves',
    nameEn: 'Ocean Waves',
    nameAr: 'أمواج المحيط',
    category: 'nature',
    type: 'file',
    src: '/sounds/ocean-waves.mp3',
    icon: 'Compass',
    descriptionEn: 'Rhythmic sea waves lapping along a calm sandy shore.',
    descriptionAr: 'حركة مد وجزر منتظمة وهادئة على الشاطئ.',
    defaultVolume: 0.5,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'river_stream',
    nameEn: 'River Stream',
    nameAr: 'خرير النهر',
    category: 'nature',
    type: 'file',
    src: '/sounds/river-stream.mp3',
    icon: 'Wind',
    descriptionEn: 'Crystal clear water flowing over pebbles in a mountain stream.',
    descriptionAr: 'جريان ماء صافٍ يتدفق فوق الحصى في جدول نهري نقي.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'wind',
    nameEn: 'Gentle Wind',
    nameAr: 'نسيم الرياح',
    category: 'nature',
    type: 'file',
    src: '/sounds/wind.mp3',
    icon: 'Airplay',
    descriptionEn: 'Soft breeze whistling softly through mountain pines.',
    descriptionAr: 'هبوب نسيم هواء لطيف يمر بين الأشجار في سكون.',
    defaultVolume: 0.4,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'forest_birds',
    nameEn: 'Forest Birds',
    nameAr: 'طيور الغابة',
    category: 'nature',
    type: 'file',
    src: '/sounds/forest-birds.mp3',
    icon: 'Sun',
    descriptionEn: 'Chirping woodland songbirds in an early morning forest.',
    descriptionAr: 'تغريد عصافير الصباح في غابة خضراء ندية.',
    defaultVolume: 0.35,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'night_crickets',
    nameEn: 'Night Crickets',
    nameAr: 'صرار الليل',
    category: 'nature',
    type: 'file',
    src: '/sounds/night-crickets.mp3',
    icon: 'Moon',
    descriptionEn: 'Nocturnal summer night ambience with serene crickets.',
    descriptionAr: 'أجواء ليلية صيفية هادئة تحت النجوم مع صرار الليل.',
    defaultVolume: 0.35,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },

  // ---------------- PLACES (Atmospheric focus) ----------------
  {
    id: 'cafe',
    nameEn: 'Quiet Cafe',
    nameAr: 'مقهى هادئ',
    category: 'places',
    type: 'file',
    src: '/sounds/cafe.mp3',
    icon: 'Coffee',
    descriptionEn: 'Gentle ceramic cup clinks and muffled distant chatter.',
    descriptionAr: 'أجواء مقهى دافئ مع صوت الفناجين وهمهمة خافتة ملهمة.',
    defaultVolume: 0.4,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'library',
    nameEn: 'Academic Library',
    nameAr: 'مكتبة جامعية',
    category: 'places',
    type: 'file',
    src: '/sounds/library.mp3',
    icon: 'BookOpen',
    descriptionEn: 'Deep room tone, page turns, and whispered productivity.',
    descriptionAr: 'سكون مهيب وتقليب أوراق خفيف في مكتبة عريقة.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'train',
    nameEn: 'Train Journey',
    nameAr: 'رحلة القطار',
    category: 'places',
    type: 'file',
    src: '/sounds/train.mp3',
    icon: 'Navigation',
    descriptionEn: 'Rhythmic, meditative clatter of wheels along railway tracks.',
    descriptionAr: 'إيقاع عجلات القطار المنتظم والمريح على السكك الحديدية.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'airplane',
    nameEn: 'Airplane Cabin',
    nameAr: 'مقصورة الطائرة',
    category: 'places',
    type: 'file',
    src: '/sounds/airplane.mp3',
    icon: 'Plane',
    descriptionEn: 'Smooth, white-noise jet engine hum at 35,000 feet altitude.',
    descriptionAr: 'طنين محرك الطائرة المستمر والنقي في الرحلات الجوية البعيدة.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'fireplace',
    nameEn: 'Fireplace',
    nameAr: 'مدفأة الحطب',
    category: 'places',
    type: 'file',
    src: '/sounds/fireplace.mp3',
    icon: 'Flame',
    descriptionEn: 'Warm crackling wood logs in a cozy winter hearth.',
    descriptionAr: 'فرقعة حطب شتوية دافئة تبعث على الطمأنينة والتركيز.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'street_calm',
    nameEn: 'Calm Street',
    nameAr: 'شارع هادئ',
    category: 'places',
    type: 'file',
    src: '/sounds/street-calm.mp3',
    icon: 'Compass',
    descriptionEn: 'Gentle outdoor ambience with distant footsteps and light city breeze.',
    descriptionAr: 'أجواء شارع هادئة مع خطوات مشاة ونسيم مدينة خفيف يبعث على الراحة.',
    defaultVolume: 0.5,
    license: 'Creative Commons 0 (CC0) / Wikimedia Commons',
  },
  {
    id: 'street_busy',
    nameEn: 'Busy Street',
    nameAr: 'شارع مزدحم',
    category: 'places',
    type: 'file',
    src: '/sounds/street-busy.mp3',
    icon: 'Building2',
    descriptionEn: 'Dynamic urban streetscape with distant traffic and active city pulse.',
    descriptionAr: 'نبض المدينة الحيوي مع حركة مرور متوازنة وحيوية شوارع دافئة.',
    defaultVolume: 0.45,
    license: 'Creative Commons 0 (CC0) / Wikimedia Commons',
  },

  // ---------------- OTHER (Focus & Rhythm) ----------------
  {
    id: 'desk_fan',
    nameEn: 'Desk Fan',
    nameAr: 'مروحة المكتب',
    category: 'other',
    type: 'file',
    src: '/sounds/desk-fan.mp3',
    icon: 'RotateCw',
    descriptionEn: 'Steady electric motor hum with consistent airflow.',
    descriptionAr: 'دوران منتظم وهادئ لمروحة هوائية مكتبية.',
    defaultVolume: 0.4,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'keyboard',
    nameEn: 'Mechanical Typing',
    nameAr: 'كتابة لوحة المفاتيح',
    category: 'other',
    type: 'file',
    src: '/sounds/keyboard.mp3',
    icon: 'Laptop',
    descriptionEn: 'Satisfying, soft tactile keystrokes for active flow state.',
    descriptionAr: 'نقرات لوحة مفاتيح مريحة تعزز شعور الإنتاجية والإنجاز.',
    defaultVolume: 0.35,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'clock',
    nameEn: 'Clock Ticking',
    nameAr: 'دقات الساعة',
    category: 'other',
    type: 'file',
    src: '/sounds/clock.mp3',
    icon: 'Clock',
    descriptionEn: 'Subtle, rhythmic second-by-second mechanical timepiece cadence.',
    descriptionAr: 'تكتكة عقارب ساعة جدارية منتظمة تضبط إيقاع التركيز.',
    defaultVolume: 0.3,
    license: 'Creative Commons 0 (CC0) / Public Domain',
  },
  {
    id: 'lofi_beats',
    nameEn: 'Lo-Fi Chill Beats',
    nameAr: 'موسيقى لو-فاي هادئة',
    category: 'other',
    type: 'file',
    src: '/sounds/lofi-beats.mp3',
    icon: 'Music',
    descriptionEn: 'Soft instrumental lo-fi chord loops with vinyl warmth.',
    descriptionAr: 'ألحان لو-فاي خالية من الكلمات تملأ المكان بهدوء دافئ.',
    defaultVolume: 0.45,
    license: 'Royalty-Free Instrumental / CC0',
  },
];

export const BUILT_IN_PRESETS: SoundMixPreset[] = [
  {
    id: 'deep_focus',
    nameEn: 'Deep Focus',
    nameAr: 'تركيز عميق',
    descriptionEn: 'Pink noise paired with soft falling rain for ultimate brainwave synchronization.',
    descriptionAr: 'ضوضاء وردية مدمجة مع مطر لطيف لصفاء ذهني وانغماس تام.',
    icon: 'Zap',
    isBuiltIn: true,
    sounds: {
      pink_noise: 0.5,
      rain: 0.4,
    },
  },
  {
    id: 'cafe_study',
    nameEn: 'Cafe Study',
    nameAr: 'مذاكرة المقهى',
    descriptionEn: 'Cozy coffee shop ambience with light tactile keyboard typing.',
    descriptionAr: 'أجواء مقهى دراسي مع نقرات خفيفة للكتابة والبحث.',
    icon: 'Coffee',
    isBuiltIn: true,
    sounds: {
      cafe: 0.45,
      keyboard: 0.25,
      library: 0.2,
    },
  },
  {
    id: 'exam_night',
    nameEn: 'Exam Night',
    nameAr: 'ليلة الامتحان',
    descriptionEn: 'Deep brown rumble with a quiet ticking clock for uninterrupted late night study.',
    descriptionAr: 'ضوضاء بنية عميقة لعزل المشوشات مع دقات ساعة تضبط الوقت.',
    icon: 'BookOpen',
    isBuiltIn: true,
    sounds: {
      brown_noise: 0.55,
      clock: 0.2,
      desk_fan: 0.25,
    },
  },
  {
    id: 'peaceful_forest',
    nameEn: 'Peaceful Forest',
    nameAr: 'سكينة الغابة',
    descriptionEn: 'Gentle river stream with woodland bird songs and a soft mountain breeze.',
    descriptionAr: 'خرير ماء النهر مع زقزقة طيور الصباح ونسيم عليل.',
    icon: 'Leaf',
    isBuiltIn: true,
    sounds: {
      river_stream: 0.5,
      forest_birds: 0.35,
      wind: 0.25,
    },
  },
  {
    id: 'cozy_night',
    nameEn: 'Cozy Hearth',
    nameAr: 'دفء المطر والمدفأة',
    descriptionEn: 'Crackling wood embers inside while heavy rain pours outside.',
    descriptionAr: 'صوت فرقعة الحطب الدافئ مع مطر غزير في الخارج.',
    icon: 'Flame',
    isBuiltIn: true,
    sounds: {
      fireplace: 0.5,
      heavy_rain: 0.45,
      thunderstorm: 0.25,
    },
  },
  {
    id: 'zen_waves',
    nameEn: 'Zen Shoreline',
    nameAr: 'شاطئ السكينة',
    descriptionEn: 'Slow ocean tide layered with green noise for soothing meditative calmness.',
    descriptionAr: 'أمواج بحر هادئة مع ضوضاء خضراء طبيعية لراحة البال والاسترخاء.',
    icon: 'Compass',
    isBuiltIn: true,
    sounds: {
      ocean_waves: 0.5,
      green_noise: 0.3,
      wind: 0.2,
    },
  },
];
