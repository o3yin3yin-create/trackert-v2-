export function generateSubtaskId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'st_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

export function recomputeTaskCompletion(task) {
  if (!task || typeof task !== 'object') return task;
  if (Array.isArray(task.subtasks)) {
    const active = task.subtasks.filter(st => st && typeof st.text === 'string' && !st.deleted);
    if (active.length > 0) {
      task.completed = active.every(st => Boolean(st.completed));
    }
  }
  if (task.completed) {
    task.rolledOver = false;
  }
  return task;
}

export function mergeSubtaskLists(listA = [], listB = []) {
  const map = new Map();
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const addSubtask = (st) => {
    if (!st || !st.id) return;
    const key = String(st.id);
    const text = typeof st.text === 'string' ? st.text.trim() : '';
    const incoming = { ...st, id: key, text };

    if (incoming.deleted && (now - (Number(incoming.updatedAt) || 0) > THIRTY_DAYS_MS)) {
      return;
    }

    const prev = map.get(key);
    if (!prev) {
      map.set(key, incoming);
      return;
    }

    const prevTs = Number(prev.updatedAt) || 0;
    const nextTs = Number(incoming.updatedAt) || 0;
    let merged;

    if (nextTs > prevTs) {
      merged = { ...prev, ...incoming, deleted: Boolean(incoming.deleted) };
    } else if (nextTs < prevTs) {
      merged = { ...incoming, ...prev, deleted: Boolean(prev.deleted) };
    } else {
      const isDeleted = Boolean(prev.deleted || incoming.deleted);
      const isCompleted = isDeleted ? false : Boolean(prev.completed || incoming.completed);
      merged = {
        ...prev,
        ...incoming,
        deleted: isDeleted,
        completed: isCompleted,
      };
    }

    if (merged.deleted && (now - (Number(merged.updatedAt) || 0) > THIRTY_DAYS_MS)) {
      map.delete(key);
      return;
    }

    map.set(key, merged);
  };

  for (const st of listA || []) addSubtask(st);
  for (const st of listB || []) addSubtask(st);

  return Array.from(map.values());
}

export function mergeTaskLists(listA = [], listB = []) {
  const map = new Map();
  const now = Date.now();
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  const add = (t) => {
    if (!t || typeof t.text !== 'string') return;
    const key = t.text.trim();
    if (!key) return;

    let incoming = { ...t, text: key };
    if (Array.isArray(incoming.subtasks)) {
      incoming.subtasks = mergeSubtaskLists(incoming.subtasks, []);
    }
    recomputeTaskCompletion(incoming);

    const prev = map.get(key);
    if (!prev) {
      if (incoming.deleted && (now - (Number(incoming.updatedAt) || 0) > THIRTY_DAYS_MS)) {
        return;
      }
      map.set(key, incoming);
      return;
    }

    const prevTs = Number(prev.updatedAt) || 0;
    const nextTs = Number(incoming.updatedAt) || 0;
    const timeSpent = Math.max(prev.timeSpent || 0, incoming.timeSpent || 0);

    let mergedItem;
    if (nextTs > prevTs) {
      // Newer record owns deleted/completed. A live add with the same text
      // must revive a tombstone (incoming.deleted is falsy → deleted: false).
      mergedItem = {
        ...prev,
        ...incoming,
        text: key,
        timeSpent,
        deleted: Boolean(incoming.deleted),
      };
    } else if (nextTs < prevTs) {
      mergedItem = {
        ...incoming,
        ...prev,
        text: key,
        timeSpent,
        deleted: Boolean(prev.deleted),
      };
    } else {
      const isDeleted = Boolean(prev.deleted || incoming.deleted);
      const isCompleted = isDeleted ? false : Boolean(prev.completed || incoming.completed);
      mergedItem = {
        ...prev,
        ...incoming,
        text: key,
        timeSpent,
        deleted: isDeleted,
        completed: isCompleted,
        rolledOver: isCompleted || isDeleted ? false : Boolean(prev.rolledOver || incoming.rolledOver),
        fromDay: prev.fromDay || incoming.fromDay,
      };
    }

    const hasSubtasksA = Array.isArray(prev.subtasks);
    const hasSubtasksB = Array.isArray(incoming.subtasks);
    if (hasSubtasksA || hasSubtasksB) {
      const subA = hasSubtasksA ? prev.subtasks : [];
      const subB = hasSubtasksB ? incoming.subtasks : [];
      mergedItem.subtasks = mergeSubtaskLists(subA, subB);

      let maxSubTs = 0;
      for (const st of mergedItem.subtasks) {
        const ts = Number(st.updatedAt) || 0;
        if (ts > maxSubTs) maxSubTs = ts;
      }
      if (maxSubTs > (Number(mergedItem.updatedAt) || 0)) {
        mergedItem.updatedAt = maxSubTs;
      }
    }

    recomputeTaskCompletion(mergedItem);

    if (mergedItem.deleted && (now - (Number(mergedItem.updatedAt) || 0) > THIRTY_DAYS_MS)) {
      map.delete(key);
      return;
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
