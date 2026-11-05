export function mergeTaskLists(listA = [], listB = []) {
  const map = new Map();
  const add = (t) => {
    if (!t || typeof t.text !== 'string') return;
    const key = t.text.trim();
    if (!key) return;
    const incoming = { ...t, text: key };
    if (incoming.completed) {
      incoming.rolledOver = false;
    }
    const prev = map.get(key);
    if (!prev) {
      map.set(key, incoming);
      return;
    }
    const prevTs = Number(prev.updatedAt) || 0;
    const nextTs = Number(incoming.updatedAt) || 0;
    const timeSpent = Math.max(prev.timeSpent || 0, incoming.timeSpent || 0);
    let mergedItem;
    if (nextTs > prevTs) {
      mergedItem = { ...prev, ...incoming, text: key, timeSpent };
    } else if (nextTs < prevTs) {
      mergedItem = { ...incoming, ...prev, text: key, timeSpent };
    } else {
      const isCompleted = Boolean(prev.completed || incoming.completed);
      mergedItem = {
        ...prev,
        ...incoming,
        text: key,
        timeSpent,
        completed: isCompleted,
        rolledOver: isCompleted ? false : Boolean(prev.rolledOver || incoming.rolledOver),
        fromDay: prev.fromDay || incoming.fromDay,
      };
    }
    if (mergedItem.completed) {
      mergedItem.rolledOver = false;
    }
    map.set(key, mergedItem);
  };
  for (const t of listA || []) add(t);
  for (const t of listB || []) add(t);
  return Array.from(map.values());
}

export function mergePomodoroTasksData(remoteData = {}, localData = {}) {
  const allDates = new Set([
    ...Object.keys(remoteData || {}),
    ...Object.keys(localData || {}),
  ]);
  const merged = {};
  for (const d of allDates) {
    const remoteList = Array.isArray(remoteData?.[d]) ? remoteData[d] : [];
    const localList = Array.isArray(localData?.[d]) ? localData[d] : [];
    merged[d] = mergeTaskLists(remoteList, localList);
  }
  return merged;
}
