/**
 * Pending local mutations overlay + sync debug helpers.
 * Survives reload before IndexedDB / server ACK.
 */

export const PENDING_OVERLAY_KEY = 'bokra_pending_sync_overlay';
export const PENDING_PAYLOAD_KEY = 'bokra_pending_sync_payload';
export const PENDING_FLAG_KEY = 'bokra_has_pending_sync';
export const DEBUG_SYNC_KEY = 'debug_sync';

export function isSyncDebug() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(DEBUG_SYNC_KEY) === '1';
  } catch {
    return false;
  }
}

export function syncDebug(event, details) {
  if (!isSyncDebug()) return;
  try {
    console.log('[sync-debug]', event, details || {});
  } catch {
    // ignore
  }
}

export function readPendingOverlay() {
  if (typeof window === 'undefined') {
    return { dailyData: {}, tasksByDate: {}, dailyTasks: null, dailyTasksDateStr: null, updatedAt: 0 };
  }
  try {
    const raw = localStorage.getItem(PENDING_OVERLAY_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return { dailyData: {}, tasksByDate: {}, dailyTasks: null, dailyTasksDateStr: null, updatedAt: 0 };
    }
    return {
      dailyData: parsed.dailyData && typeof parsed.dailyData === 'object' ? parsed.dailyData : {},
      tasksByDate: parsed.tasksByDate && typeof parsed.tasksByDate === 'object' ? parsed.tasksByDate : {},
      dailyTasks: Array.isArray(parsed.dailyTasks) ? parsed.dailyTasks : null,
      dailyTasksDateStr: typeof parsed.dailyTasksDateStr === 'string' ? parsed.dailyTasksDateStr : null,
      updatedAt: Number(parsed.updatedAt) || 0,
    };
  } catch {
    return { dailyData: {}, tasksByDate: {}, dailyTasks: null, dailyTasksDateStr: null, updatedAt: 0 };
  }
}

export function replacePendingOverlay(nextOverlay) {
  if (typeof window === 'undefined') return;
  const next = {
    dailyData: nextOverlay?.dailyData && typeof nextOverlay.dailyData === 'object' ? nextOverlay.dailyData : {},
    tasksByDate: nextOverlay?.tasksByDate && typeof nextOverlay.tasksByDate === 'object' ? nextOverlay.tasksByDate : {},
    dailyTasks: Array.isArray(nextOverlay?.dailyTasks) ? nextOverlay.dailyTasks : null,
    dailyTasksDateStr: typeof nextOverlay?.dailyTasksDateStr === 'string' ? nextOverlay.dailyTasksDateStr : null,
    updatedAt: Date.now(),
  };
  try {
    if (!overlayHasPending(next) && !Array.isArray(next.dailyTasks)) {
      localStorage.removeItem(PENDING_OVERLAY_KEY);
      return next;
    }
    localStorage.setItem(PENDING_OVERLAY_KEY, JSON.stringify(next));
    localStorage.setItem(PENDING_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('[bokra Sync] Failed to replace pending overlay:', err);
  }
  return next;
}

export function writePendingOverlay(patch = {}) {
  if (typeof window === 'undefined') return;
  const prev = readPendingOverlay();
  const next = {
    dailyData: { ...(prev.dailyData || {}), ...(patch.dailyData || {}) },
    tasksByDate: { ...(prev.tasksByDate || {}) },
    dailyTasks: Array.isArray(patch.dailyTasks) ? patch.dailyTasks : prev.dailyTasks,
    dailyTasksDateStr: patch.dailyTasksDateStr !== undefined ? patch.dailyTasksDateStr : prev.dailyTasksDateStr,
    updatedAt: Date.now(),
  };
  if (patch.tasksByDate && typeof patch.tasksByDate === 'object') {
    for (const [date, list] of Object.entries(patch.tasksByDate)) {
      if (Array.isArray(list)) next.tasksByDate[date] = list;
    }
  }
  try {
    localStorage.setItem(PENDING_OVERLAY_KEY, JSON.stringify(next));
    localStorage.setItem(PENDING_FLAG_KEY, 'true');
  } catch (err) {
    console.warn('[bokra Sync] Failed to persist pending overlay:', err);
  }
  return next;
}

export function clearPendingOverlay() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_OVERLAY_KEY);
    localStorage.removeItem(PENDING_PAYLOAD_KEY);
    localStorage.removeItem(PENDING_FLAG_KEY);
  } catch {
    // ignore
  }
}

export function overlayHasPending(overlay) {
  if (!overlay) return false;
  if (overlay.dailyData && Object.keys(overlay.dailyData).length > 0) return true;
  if (overlay.tasksByDate && Object.keys(overlay.tasksByDate).length > 0) return true;
  return false;
}

export function persistTaskKeysSync({ isPreview, dailyTasks, dateStr, pomodoroTasksData, dailyData }) {
  if (typeof window === 'undefined') return;
  try {
    if (isPreview) {
      if (Array.isArray(dailyTasks)) {
        localStorage.setItem('preview_tasks_v1', JSON.stringify(dailyTasks));
      }
      return;
    }
    if (Array.isArray(dailyTasks)) {
      localStorage.setItem('daybase_daily_tasks_v4', JSON.stringify(dailyTasks));
    }
    if (typeof dateStr === 'string' && dateStr.length === 10) {
      localStorage.setItem('daybase_daily_tasks_date_v4', dateStr);
    }
    if (pomodoroTasksData && typeof pomodoroTasksData === 'object') {
      localStorage.setItem('daybase_pomodoro_tasks_v1', JSON.stringify(pomodoroTasksData));
    }
    if (dailyData && typeof dailyData === 'object') {
      localStorage.setItem('daybase_dailyData_v4', JSON.stringify(dailyData));
    }
    syncDebug('localStorage.write', {
      dateStr,
      dailyTaskCount: Array.isArray(dailyTasks) ? dailyTasks.length : undefined,
      pomodoroDates: pomodoroTasksData ? Object.keys(pomodoroTasksData) : undefined,
      dailyDataKeys: dailyData ? Object.keys(dailyData).length : undefined,
    });
  } catch (err) {
    console.warn('[bokra Sync] Failed to write localStorage:', err);
  }
}

export function serverAcknowledgedTask(serverList, localTask) {
  if (!localTask || typeof localTask.text !== 'string') return true;
  const key = localTask.text.trim();
  if (!key) return true;
  const match = (Array.isArray(serverList) ? serverList : []).find(
    (t) => t && typeof t.text === 'string' && t.text.trim() === key
  );
  if (!match) return Boolean(localTask.deleted);
  const localTs = Number(localTask.updatedAt) || 0;
  const serverTs = Number(match.updatedAt) || 0;
  if (serverTs < localTs) return false;
  return Boolean(match.deleted) === Boolean(localTask.deleted)
    && Boolean(match.completed) === Boolean(localTask.completed);
}

export function pruneAcknowledgedOverlay(overlay, serverState) {
  const next = {
    dailyData: {},
    tasksByDate: {},
    dailyTasks: overlay?.dailyTasks || null,
    dailyTasksDateStr: overlay?.dailyTasksDateStr || null,
    updatedAt: overlay?.updatedAt || 0,
  };
  const serverDaily = serverState?.dailyData && typeof serverState.dailyData === 'object'
    ? serverState.dailyData
    : {};
  for (const [k, v] of Object.entries(overlay?.dailyData || {})) {
    if (serverDaily[k] !== v) next.dailyData[k] = v;
  }
  const serverTasks = serverState?.pomodoroTasksData && typeof serverState.pomodoroTasksData === 'object'
    ? serverState.pomodoroTasksData
    : {};
  for (const [date, list] of Object.entries(overlay?.tasksByDate || {})) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const serverList = Array.isArray(serverTasks[date]) ? serverTasks[date] : [];
    const unacked = list.filter((t) => !serverAcknowledgedTask(serverList, t));
    if (unacked.length > 0) next.tasksByDate[date] = list;
  }
  return next;
}

export function buildDeltaPayload({
  pomodoroTasksData,
  targetDates,
  pendingDailyData,
  activeDateStr,
  clientTodayStr,
  timezone,
  deletedHabitIds,
}) {
  const dates = Array.from(new Set((targetDates || []).filter((d) => typeof d === 'string' && d.length === 10)));
  const tasks = {};
  for (const d of dates) {
    if (Array.isArray(pomodoroTasksData?.[d])) tasks[d] = pomodoroTasksData[d];
  }
  const dailyData = pendingDailyData && typeof pendingDailyData === 'object' ? { ...pendingDailyData } : {};
  const payload = {
    pomodoroTasksData: tasks,
    dailyData,
    dailyDataPartial: true,
    targetDates: dates,
    activeDateStr: activeDateStr || null,
    clientTodayStr: clientTodayStr || null,
    timezone: timezone || null,
    deletedHabitIds: Array.isArray(deletedHabitIds) ? deletedHabitIds : [],
    updatedAt: Date.now(),
  };
  return payload;
}
