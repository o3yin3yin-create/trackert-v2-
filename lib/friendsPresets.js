// Shared presets, demo data, and helper functions for Friends widget and modal

export const PRESENCE_PRESETS = [
  {
    kind: 'music',
    tag: 'Music',
    line: 'MAAYA W NAR · on Spotify',
    right: '2:47',
    status: 'Listening on Spotify',
    label: 'LISTENING TO',
    big: 'MAAYA W NAR',
    bigSize: 34,
    sub: 'Spotify',
    pct: 42,
    hasBar: true,
    barL: '2:47',
    barR: '4:15',
    hasChips: false,
    chips: [],
    hasDots: false,
    dots: [],
    action: 'Listen along',
    together: '2h 15m',
    hasMusicBadge: true,
    hasSec: true,
    secTitle: 'MAAYA W NAR',
    secSub: 'Spotify',
    secPct: 42,
  },
  {
    kind: 'flight',
    tag: 'Flight',
    line: 'CTU → FRA · in the air',
    right: '05:52:11',
    status: 'On a focus flight',
    label: 'FOCUS FLIGHT',
    big: 'CTU → FRA',
    bigSize: 38,
    sub: 'Chengdu to Frankfurt · 05:52:11 left',
    pct: 45,
    hasBar: true,
    barL: 'CTU',
    barR: 'FRA',
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
    kind: 'focus',
    tag: 'Focus',
    line: 'Focus 2/4 · 10:20 left',
    right: '10:20',
    status: 'Studying',
    label: 'FOCUS SESSION',
    big: '10:20',
    bigSize: 56,
    sub: 'left · cycle 2 of 4',
    pct: 62,
    hasBar: true,
    barL: '14:40 done',
    barR: '25:00',
    hasChips: false,
    chips: [],
    hasDots: true,
    dots: [1, 1, 0, 0],
    action: 'Join session',
    together: '6h 20m',
    hasMusicBadge: false,
    hasSec: false,
  },
  {
    kind: 'lecture',
    tag: 'Lecture',
    line: 'In lecture · TT284',
    right: '42 min',
    status: 'In a lecture',
    label: 'IN LECTURE',
    big: 'TT284',
    bigSize: 44,
    sub: 'Ends in 42 min',
    pct: 0,
    hasBar: false,
    barL: '',
    barR: '',
    hasChips: true,
    chips: ['11:30 AM', 'Weekly'],
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
    line: 'Idle · last seen 2h ago',
    right: '2h ago',
    status: 'Not active',
    label: 'OFFLINE',
    big: 'Offline',
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
    friendshipId: 'demo-sara',
    user: { username: 'sara', name: 'Sara', avatar: 'sparkles' },
    displayName: 'Sara',
    initial: 'S',
    presence: PRESENCE_PRESETS[0],
  },
  {
    friendshipId: 'demo-ahmed',
    user: { username: 'ahmed', name: 'Ahmed', avatar: 'plane' },
    displayName: 'Ahmed',
    initial: 'A',
    presence: PRESENCE_PRESETS[1],
  },
  {
    friendshipId: 'demo-omar',
    user: { username: 'omar', name: 'Omar', avatar: 'crown' },
    displayName: 'Omar',
    initial: 'O',
    presence: PRESENCE_PRESETS[2],
  },
  {
    friendshipId: 'demo-mona',
    user: { username: 'mona', name: 'Mona', avatar: 'book' },
    displayName: 'Mona',
    initial: 'M',
    presence: PRESENCE_PRESETS[3],
  },
  {
    friendshipId: 'demo-youssef',
    user: { username: 'youssef', name: 'Youssef', avatar: 'target' },
    displayName: 'Youssef',
    initial: 'Y',
    presence: PRESENCE_PRESETS[4],
  },
  {
    friendshipId: 'demo-hana',
    user: { username: 'hana', name: 'Hana', avatar: 'user' },
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
 * Extracts exact data for the Island Friends Widget:
 * - isOffline: boolean
 * - iconType: 'music' | 'flight' | 'focus' | 'lecture' | 'habit' | 'offline'
 * - title: string (e.g. "MAAYA W NAR", "CTU → FRA", "Focus 2/4", "TT284", "Offline")
 * - time: string (e.g. "2:47", "05:52:11", "10:20", "42 min", "2h ago")
 */
export const getIslandDetails = (presence) => {
  if (!presence) {
    return {
      isOffline: true,
      iconType: 'offline',
      title: 'Offline',
      time: '2h ago',
    };
  }

  // If user has multiple concurrent active activities (e.g. Lecture + Pomodoro)
  if (presence.hasMultiple && Array.isArray(presence.activities) && presence.activities.length > 1) {
    const actDetails = presence.activities.map(act => getIslandDetails({ ...act, hasMultiple: false }));
    const first = actDetails[0] || { iconType: 'focus', title: 'Focus', time: '' };
    const second = actDetails[1] || { iconType: 'lecture', title: 'Lecture', time: '' };

    return {
      isOffline: false,
      hasMultiple: true,
      activities: actDetails,
      iconType: first.iconType,
      secondaryIconType: second.iconType,
      title: `${first.title} + ${second.title}`,
      time: `${first.time} · ${second.time}`,
      primary: first,
      secondary: second,
    };
  }

  const kind = presence.kind || 'idle';

  switch (kind) {
    case 'music': {
      const track = presence.secTitle || presence.big || 'MUSIC';
      return {
        isOffline: false,
        iconType: 'music',
        title: String(track).toUpperCase(),
        time: presence.right || '2:47',
      };
    }
    case 'flight': {
      const route = presence.big || 'CTU → FRA';
      return {
        isOffline: false,
        iconType: 'flight',
        title: String(route).toUpperCase(),
        time: presence.right || '05:52:11',
      };
    }
    case 'focus': {
      let cycle = ' 2/4';
      if (Array.isArray(presence.dots) && presence.dots.length > 0) {
        const completed = presence.dots.filter(Boolean).length;
        cycle = ` ${completed}/${presence.dots.length}`;
      } else if (presence.sub && typeof presence.sub === 'string' && presence.sub.includes('cycle')) {
        const m = presence.sub.match(/cycle\s*(\d+)\s*of\s*(\d+)/i);
        if (m) cycle = ` ${m[1]}/${m[2]}`;
      }
      return {
        isOffline: false,
        iconType: 'focus',
        title: `Focus${cycle}`,
        time: presence.right || presence.big || '10:20',
      };
    }
    case 'lecture':
    case 'study':
    case 'meeting':
    case 'exam':
    case 'workout':
    case 'scheduled': {
      const code = presence.big || presence.tag || 'TT284';
      return {
        isOffline: false,
        iconType: 'lecture',
        title: String(code).toUpperCase(),
        time: presence.right || 'Today',
      };
    }
    case 'habit': {
      const habit = presence.big || 'Habit';
      return {
        isOffline: false,
        iconType: 'habit',
        title: String(habit).toUpperCase(),
        time: presence.right || 'Done',
      };
    }
    case 'idle':
    default: {
      return {
        isOffline: true,
        iconType: 'offline',
        title: 'Offline',
        time: presence.right || '2h ago',
      };
    }
  }
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
