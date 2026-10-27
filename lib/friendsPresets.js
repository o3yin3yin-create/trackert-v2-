// Shared presets, demo data, and helper functions for Friends widget and modal

export const PRESENCE_PRESETS = [
  {
    kind: 'focus',
    tag: 'Focus',
    line: 'Focus 15:19 · Deep Work',
    right: '15:19',
    status: 'Studying · listening to Spotify',
    label: 'FOCUS SESSION',
    big: '15:19',
    bigSize: 56,
    sub: 'left · cycle 2 of 4',
    pct: 62,
    hasBar: true,
    barL: '10:41 done',
    barR: '25:00',
    hasChips: false,
    chips: [],
    hasDots: true,
    dots: [1, 1, 0, 0],
    action: 'Join session',
    together: '6h 20m',
    hasMusicBadge: true,
    hasSec: true,
    secTitle: 'Midnight City',
    secSub: 'M83 · on Spotify',
    secPct: 38,
  },
  {
    kind: 'flight',
    tag: 'Flight',
    line: 'CAI → DXB · in the air',
    right: '40 min',
    status: 'On a focus flight',
    label: 'FOCUS FLIGHT',
    big: 'CAI → DXB',
    bigSize: 38,
    sub: 'Cairo to Dubai · 40 min left',
    pct: 45,
    hasBar: true,
    barL: 'CAI',
    barR: 'DXB',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Hop on this flight',
    together: '3h 05m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'music',
    tag: 'Music',
    line: 'Weightless · Marconi Union',
    right: '1:24',
    status: 'Listening on Spotify',
    label: 'LISTENING TO',
    big: 'Weightless',
    bigSize: 34,
    sub: 'Marconi Union',
    pct: 38,
    hasBar: true,
    barL: '1:24',
    barR: '4:03',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Listen along',
    together: '1h 40m',
    hasMusicBadge: true,
    hasSec: false,
  },
  {
    kind: 'lecture',
    tag: 'Lecture',
    line: 'In lecture · CS101 · Hall 3',
    right: '48 min',
    status: 'In a lecture',
    label: 'IN LECTURE',
    big: 'CS101',
    bigSize: 44,
    sub: 'Ends in 48 min',
    pct: 0,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: true,
    chips: ['11:30 AM', 'Hall 3', 'Weekly'],
    hasDots: false,
    dots: [],
    action: 'Plan a study session',
    together: '2h 10m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'habit',
    tag: 'Habit',
    line: 'Just finished Reading 30m',
    right: 'Done',
    status: 'Finished a habit',
    label: 'JUST FINISHED',
    big: 'Reading 30m',
    bigSize: 40,
    sub: 'Streak: 12 days',
    pct: 100,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: false,
    chips: [],
    hasDots: true,
    dots: [1, 1, 1, 1, 1],
    action: 'Cheer them on',
    together: '4h 30m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'idle',
    tag: 'Idle',
    line: 'Idle · last seen recently',
    right: 'Active',
    status: 'Not active',
    label: 'IDLE',
    big: 'Active recently',
    bigSize: 28,
    sub: 'No activity right now',
    pct: 0,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Ask to study',
    together: '0h',
    hasMusicBadge: false,
    hasSec: false,
  },
];

export const DEMO_FRIENDS = [
  {
    friendshipId: 'demo-ahmed',
    user: { username: 'ahmed', name: 'Ahmed', avatar: 'crown' },
    displayName: 'Ahmed',
    initial: 'A',
    presence: PRESENCE_PRESETS[0],
  },
  {
    friendshipId: 'demo-sara',
    user: { username: 'sara', name: 'Sara', avatar: 'sparkles' },
    displayName: 'Sara',
    initial: 'S',
    presence: PRESENCE_PRESETS[1],
  },
  {
    friendshipId: 'demo-omar',
    user: { username: 'omar', name: 'Omar', avatar: 'flame' },
    displayName: 'Omar',
    initial: 'O',
    presence: PRESENCE_PRESETS[2],
  },
  {
    friendshipId: 'demo-mona',
    user: { username: 'mona', name: 'Mona', avatar: 'rocket' },
    displayName: 'Mona',
    initial: 'M',
    presence: PRESENCE_PRESETS[3],
  },
  {
    friendshipId: 'demo-youssef',
    user: { username: 'youssef', name: 'Youssef', avatar: 'headphones' },
    displayName: 'Youssef',
    initial: 'Y',
    presence: PRESENCE_PRESETS[4],
  },
  {
    friendshipId: 'demo-hana',
    user: { username: 'hana', name: 'Hana', avatar: 'smile' },
    displayName: 'Hana',
    initial: 'H',
    presence: PRESENCE_PRESETS[5],
  },
];

export const getSafeTrackArt = (url) => {
  if (!url) return null;
  if (url.startsWith('/')) return url;
  if (url.includes('scdn.co') || url.includes('spotifycdn.com')) {
    return `/api/spotify/image?url=${encodeURIComponent(url)}`;
  }
  return url;
};

// Activity priority for auto/online sorting (lowest number = highest priority)
const KIND_PRIORITY = {
  focus: 1,
  flight: 2,
  music: 3,
  lecture: 4,
  study: 4,
  meeting: 4,
  exam: 4,
  workout: 4,
  habit: 5,
  idle: 6,
};

/**
 * Returns the friend to display on the Home Screen widget.
 * If pinnedUsername is provided and exists, returns that friend with isPinned: true.
 * Otherwise returns the most active/online friend with isPinned: false.
 */
export const getDisplayFriend = (friendsList, pinnedUsername) => {
  const list = Array.isArray(friendsList) && friendsList.length > 0 ? friendsList : DEMO_FRIENDS;

  // 1. Look for pinned friend first
  if (pinnedUsername) {
    const cleanPinned = String(pinnedUsername).trim().toLowerCase();
    const matched = list.find((f) => {
      const u = (f.user?.username || f.displayName || '').toLowerCase();
      return u === cleanPinned;
    });
    if (matched) {
      return { ...matched, isPinned: true };
    }
  }

  // 2. Otherwise sort by activity priority
  const sorted = [...list].sort((a, b) => {
    const pA = KIND_PRIORITY[a.presence?.kind] || 99;
    const pB = KIND_PRIORITY[b.presence?.kind] || 99;
    return pA - pB;
  });

  return { ...sorted[0], isPinned: false };
};

/**
 * Concise one-line brief of friend's activity ("بريف في رغيف")
 */
export const formatBriefActivity = (presence) => {
  if (!presence) return 'Online';
  const kind = presence.kind || 'idle';

  switch (kind) {
    case 'focus': {
      const timer = presence.right || presence.big || '';
      const track = presence.secTitle ? ` · ${presence.secTitle}` : '';
      return timer ? `Focusing · ${timer} left${track}` : (presence.line || 'Focusing');
    }
    case 'flight': {
      const route = presence.big || 'Focus Flight';
      const rem = presence.right || '';
      return rem ? `${route} · ${rem} left` : (presence.line || 'On a flight');
    }
    case 'music': {
      const title = presence.big || presence.secTitle || 'Spotify';
      const artist = presence.sub || presence.secSub || '';
      return artist ? `Listening to ${title} · ${artist}` : `Listening to ${title}`;
    }
    case 'lecture':
    case 'study':
    case 'meeting':
    case 'exam':
    case 'workout': {
      return presence.line || presence.status || 'In session';
    }
    case 'habit': {
      return presence.line || presence.status || 'Completed a habit';
    }
    case 'idle':
    default: {
      return presence.line || 'Active recently';
    }
  }
};

/**
 * Clean status badge label (strictly no emojis)
 */
export const getActivityBadge = (presence, isPinned) => {
  if (isPinned) return 'PINNED';
  if (!presence) return 'ONLINE';
  switch (presence.kind) {
    case 'focus': return 'FOCUSING';
    case 'flight': return 'FLIGHT';
    case 'music': return 'LISTENING';
    case 'lecture': return 'LECTURE';
    case 'study': return 'STUDYING';
    case 'meeting': return 'MEETING';
    case 'exam': return 'EXAM';
    case 'workout': return 'WORKOUT';
    case 'habit': return 'ACTIVE';
    case 'idle': return 'ONLINE';
    default: return 'ONLINE';
  }
};
