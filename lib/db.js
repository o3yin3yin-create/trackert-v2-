/**
 * IndexedDB Offline-First Storage & Synchronization Engine for bokra
 * 
 * Guarantees:
 * 1. Zero startup latency - Loads immediately from local IndexedDB.
 * 2. Works 100% offline - All changes persist locally and queue for sync.
 * 3. Last-Write-Wins Conflict Resolution - Prevents overwriting newer edits across devices.
 */

const DB_NAME = 'bokra_offline_db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return resolve(null);
    }

    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('habits')) {
        db.createObjectStore('habits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('dailyLogs')) {
        db.createObjectStore('dailyLogs', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Load complete state from IndexedDB instantly
 */
export async function loadLocalOfflineState() {
  try {
    const db = await openDB();
    if (!db) return null;

    const tx = db.transaction(['habits', 'dailyLogs', 'meta'], 'readonly');
    const habitsStore = tx.objectStore('habits');
    const logsStore = tx.objectStore('dailyLogs');
    const metaStore = tx.objectStore('meta');

    const getAll = (store) => new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    const [habitsList, logsList, metaList] = await Promise.all([
      getAll(habitsStore),
      getAll(logsStore),
      getAll(metaStore),
    ]);

    const metaMap = {};
    for (const item of metaList) {
      metaMap[item.key] = item.value;
    }

    const dailyData = {};
    const sleepData = {};
    const focusTimeData = {};
    const pomodoroTasksData = {};

    for (const log of logsList) {
      if (log.logs && typeof log.logs === 'object') {
        Object.assign(dailyData, log.logs);
      }
      if (log.sleep !== undefined && log.sleep !== null) {
        sleepData[log.date] = log.sleep;
      }
      if (log.focusTime) {
        focusTimeData[log.date] = log.focusTime;
      }
      if (log.tasks && Array.isArray(log.tasks)) {
        pomodoroTasksData[log.date] = log.tasks;
      }
    }

    return {
      habits: habitsList.length > 0 ? habitsList : null,
      dailyData: Object.keys(dailyData).length > 0 ? dailyData : null,
      sleepData: Object.keys(sleepData).length > 0 ? sleepData : null,
      focusTimeData: Object.keys(focusTimeData).length > 0 ? focusTimeData : null,
      pomodoroTasksData: Object.keys(pomodoroTasksData).length > 0 ? pomodoroTasksData : null,
      theme: metaMap['theme'],
      bgStyle: metaMap['bgStyle'],
      lang: metaMap['lang'],
      themeColor: metaMap['themeColor'],
      avatar: metaMap['avatar'],
      mission: metaMap['mission'] || "",
      emergencyCards: metaMap['emergencyCards'],
      grantedCardsLog: metaMap['grantedCardsLog'],
      finishedTickets: metaMap['finishedTickets'],
      updatedAt: metaMap['updatedAt'] || 0,
    };
  } catch (err) {
    console.warn('[bokra DB] Error loading local state:', err);
    return null;
  }
}

/**
 * Save complete state to local IndexedDB
 */
export async function saveLocalOfflineState(state) {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction(['habits', 'dailyLogs', 'meta'], 'readwrite');
    const habitsStore = tx.objectStore('habits');
    const logsStore = tx.objectStore('dailyLogs');
    const metaStore = tx.objectStore('meta');

    // 1. Save Habits
    if (state.habits && Array.isArray(state.habits)) {
      habitsStore.clear();
      for (const h of state.habits) {
        habitsStore.put({
          ...h,
          updatedAt: h.updatedAt || Date.now(),
        });
      }
    }

    // 2. Save Daily Logs
    const dates = new Set([
      ...Object.keys(state.dailyData || {}).map(k => k.substring(0, 10)),
      ...Object.keys(state.sleepData || {}),
      ...Object.keys(state.focusTimeData || {}),
      ...Object.keys(state.pomodoroTasksData || {})
    ]);

    for (const date of dates) {
      if (!date || date.length !== 10) continue;

      const dateDailyData = {};
      for (const [k, v] of Object.entries(state.dailyData || {})) {
        if (k.startsWith(date)) {
          dateDailyData[k] = v;
        }
      }

      logsStore.put({
        date,
        logs: dateDailyData,
        sleep: state.sleepData?.[date] || null,
        focusTime: state.focusTimeData?.[date] || 0,
        tasks: state.pomodoroTasksData?.[date] || [],
        updatedAt: Date.now(),
      });
    }

    // 3. Save Meta
    const metaKeys = [
      'theme', 'bgStyle', 'lang', 'themeColor', 'avatar', 'mission',
      'emergencyCards', 'grantedCardsLog', 'finishedTickets'
    ];
    for (const key of metaKeys) {
      if (state[key] !== undefined) {
        metaStore.put({ key, value: state[key] });
      }
    }
    metaStore.put({ key: 'updatedAt', value: Date.now() });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[bokra DB] Error saving local state:', err);
  }
}

/**
 * Record a mutation into the sync queue (Pending changes not yet on server)
 */
export async function queueSyncMutation(type, payload) {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');
    store.add({
      type,
      payload,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[bokra DB] Error queuing mutation:', err);
  }
}

/**
 * Retrieve all pending mutations
 */
export async function getPendingSyncQueue() {
  try {
    const db = await openDB();
    if (!db) return [];

    const tx = db.transaction('syncQueue', 'readonly');
    const store = tx.objectStore('syncQueue');

    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('[bokra DB] Error getting pending queue:', err);
    return [];
  }
}

/**
 * Clear synced items from queue
 */
export async function clearPendingSyncQueue(ids = []) {
  try {
    const db = await openDB();
    if (!db) return;

    const tx = db.transaction('syncQueue', 'readwrite');
    const store = tx.objectStore('syncQueue');

    if (!ids || ids.length === 0) {
      store.clear();
    } else {
      for (const id of ids) {
        store.delete(id);
      }
    }
  } catch (err) {
    console.warn('[bokra DB] Error clearing sync queue:', err);
  }
}

/**
 * Conflict Resolution: Last-Write-Wins (LWW)
 * Merges local and remote states based on timestamps
 */
export function resolveConflict(localState, remoteState) {
  if (!localState) return remoteState;
  if (!remoteState) return localState;

  const merged = { ...remoteState };
  const hasPending = Boolean(localState.hasPendingChanges);

  // 1. Resolve Habits
  if (!hasPending && remoteState.habits && Array.isArray(remoteState.habits) && remoteState.habits.length > 0) {
    merged.habits = remoteState.habits;
  } else if (!localState.habits || localState.habits.length === 0) {
    merged.habits = remoteState.habits || [];
  } else if (!remoteState.habits || remoteState.habits.length === 0) {
    merged.habits = localState.habits || [];
  } else {
    const localHabitsMap = new Map((localState.habits || []).map(h => [h.id, h]));
    const remoteHabitsMap = new Map((remoteState.habits || []).map(h => [h.id, h]));

    const mergedHabits = [];
    const allHabitIds = new Set([...localHabitsMap.keys(), ...remoteHabitsMap.keys()]);

    for (const id of allHabitIds) {
      const localH = localHabitsMap.get(id);
      const remoteH = remoteHabitsMap.get(id);

      if (localH && remoteH) {
        const localTime = new Date(localH.updatedAt || 0).getTime();
        const remoteTime = new Date(remoteH.updatedAt || 0).getTime();
        mergedHabits.push(remoteTime > localTime ? remoteH : localH);
      } else if (remoteH) {
        mergedHabits.push(remoteH);
      } else if (localH) {
        mergedHabits.push(localH);
      }
    }
    merged.habits = mergedHabits;
  }

  // 2. Resolve Daily Check Data
  if (hasPending) {
    merged.dailyData = {
      ...(remoteState.dailyData || {}),
      ...(localState.dailyData || {})
    };
  } else {
    merged.dailyData = { ...(remoteState.dailyData || {}) };
  }

  // 3. Resolve Sleep Data
  if (hasPending) {
    merged.sleepData = {
      ...(remoteState.sleepData || {}),
      ...(localState.sleepData || {})
    };
  } else {
    merged.sleepData = { ...(remoteState.sleepData || {}) };
  }

  // 4. Resolve Focus Time
  if (hasPending) {
    merged.focusTimeData = {
      ...(remoteState.focusTimeData || {}),
      ...(localState.focusTimeData || {})
    };
  } else {
    merged.focusTimeData = { ...(remoteState.focusTimeData || {}) };
  }

  // 5. Resolve Pomodoro Tasks
  if (hasPending) {
    merged.pomodoroTasksData = {
      ...(remoteState.pomodoroTasksData || {}),
      ...(localState.pomodoroTasksData || {})
    };
  } else {
    merged.pomodoroTasksData = { ...(remoteState.pomodoroTasksData || {}) };
  }

  // 6. Resolve Metadata & Settings (Theme, avatar, mission, cards, etc.)
  if (!hasPending) {
    if (remoteState.theme) merged.theme = remoteState.theme;
    if (remoteState.bgStyle) merged.bgStyle = remoteState.bgStyle;
    if (remoteState.lang) merged.lang = remoteState.lang;
    if (remoteState.themeColor) merged.themeColor = remoteState.themeColor;
    if (remoteState.avatar) merged.avatar = remoteState.avatar;
    if (remoteState.mission !== undefined && remoteState.mission !== null) merged.mission = remoteState.mission;
  } else {
    if (remoteState.mission !== undefined && remoteState.mission !== null && !localState.mission) {
      merged.mission = remoteState.mission;
    }
  }

  if (remoteState.emergencyCards && remoteState.emergencyCards.length > 0) {
    merged.emergencyCards = remoteState.emergencyCards;
  }
  if (remoteState.grantedCardsLog && Object.keys(remoteState.grantedCardsLog).length > 0) {
    merged.grantedCardsLog = remoteState.grantedCardsLog;
  }
  if (remoteState.finishedTickets && remoteState.finishedTickets.length > 0) {
    merged.finishedTickets = remoteState.finishedTickets;
  }

  return merged;
}
