import { NextResponse } from 'next/server'
import { getCurrentDbUser } from '@/lib/currentUser'
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors'

// החقول الوحيدة اللي بتتبعت لمستخدم تاني (مفيش id ولا email ولا clerkId)
export const PUBLIC_SELECT = { username: true, name: true, avatar: true }
export const pub = (u) => (u ? { username: u.username, name: u.name, avatar: u.avatar } : null)

export const PRESENCE_SELECT = {
  username: true,
  name: true,
  avatar: true,
  updatedAt: true,
  activeSessionType: true,
  activeSessionData: true,
  habits: {
    select: {
      id: true,
      name: true,
      time: true,
      duration: true,
      location: true,
      frequency: true,
      scheduleDays: true,
      scheduleDate: true,
      isPrivate: true,
    },
  },
  dailyLogs: {
    select: {
      date: true,
      focusTime: true,
      logs: true,
    },
    take: 7,
    orderBy: { date: 'desc' },
  },
}

// دالة حساب الـ Presence الحقيقي بناءً على النشاط الفعلي للمستخدم
export function computeRealPresence(user) {
  if (!user) return null
  const nowMs = Date.now()
  const nowSec = Math.floor(nowMs / 1000)

  // 1. حساب الوقت الإجمالي المشترك هذا الأسبوع
  let totalWeekFocusSec = 0
  let todayCompletedHabitsCount = 0
  let todayTotalHabits = Array.isArray(user.habits) ? user.habits.length : 0
  let lastCompletedHabitName = null

  const todayStr = new Date().toISOString().split('T')[0]

  if (Array.isArray(user.dailyLogs)) {
    for (const log of user.dailyLogs) {
      if (typeof log.focusTime === 'number') {
        totalWeekFocusSec += log.focusTime
      }
      if (log.date === todayStr && log.logs && typeof log.logs === 'object') {
        const completedKeys = Object.entries(log.logs)
          .filter(([_, val]) => Boolean(val))
          .map(([k]) => k)
        todayCompletedHabitsCount = completedKeys.length
        if (completedKeys.length > 0 && Array.isArray(user.habits)) {
          const matched = user.habits.find((h) => h.id === completedKeys[completedKeys.length - 1])
          if (matched) lastCompletedHabitName = matched.name
        }
      }
    }
  }

  const hoursTogether = Math.floor(totalWeekFocusSec / 3600)
  const minsTogether = Math.floor((totalWeekFocusSec % 3600) / 60)
  const togetherStr = hoursTogether > 0 
    ? `${hoursTogether}h ${minsTogether}m`
    : minsTogether > 0 
    ? `${minsTogether}m` 
    : '0h'

  // 2. فحص الجلسة النشطة والموسيقى
  const sessionType = user.activeSessionType
  const sessionData = user.activeSessionData
  const spotifyTrack = sessionData?.spotifyTrack
  const hasMusic = Boolean(
    spotifyTrack?.title &&
    spotifyTrack?.isPlaying &&
    (nowMs - (spotifyTrack.updatedAt || nowMs) < 6 * 60 * 1000)
  )

  // حالة أ: جلسة تركيز / بومودورو نشطة
  if (sessionType === 'pomodoro' && sessionData?.endTime) {
    const endSec = sessionData.endTime
    const remainingSec = endSec - nowSec
    if (remainingSec > 0) {
      const initialSec = sessionData.initialTime || 1500
      const elapsedSec = Math.max(0, initialSec - remainingSec)
      const pct = Math.min(100, Math.max(0, Math.round((elapsedSec / initialSec) * 100)))
      const remMins = Math.floor(remainingSec / 60)
      const remSecs = remainingSec % 60
      const bigTimer = `${remMins}:${String(remSecs).padStart(2, '0')}`
      const elapsedMins = Math.floor(elapsedSec / 60)
      const elapsedSecs = elapsedSec % 60
      const barL = `${elapsedMins}:${String(elapsedSecs).padStart(2, '0')} done`
      const barR = `${Math.floor(initialSec / 60)}:00`
      const taskName = sessionData.taskName || 'Focus'
      const step = sessionData.step || sessionData.cycle || 1
      const totalCycles = sessionData.totalCycles || 4
      const dots = Array.from({ length: totalCycles }, (_, i) => (i < step ? 1 : 0))

      return {
        kind: 'focus',
        tag: 'Focus',
        line: `Focus ${bigTimer} · ${taskName}`,
        right: bigTimer,
        status: hasMusic ? 'Studying · listening to Spotify' : 'Studying',
        label: 'FOCUS SESSION',
        big: bigTimer,
        bigSize: 56,
        sub: `left · cycle ${step} of ${totalCycles}`,
        pct,
        hasBar: true,
        barL,
        barR,
        hasChips: false,
        chips: [],
        hasDots: true,
        dots,
        action: 'Join session',
        together: togetherStr,
        hasMusicBadge: hasMusic,
        hasSec: hasMusic,
        secTitle: spotifyTrack?.title || '',
        secSub: spotifyTrack?.artist ? `${spotifyTrack.artist} · on Spotify` : '',
        secPct: spotifyTrack?.progressPct || 0,
      }
    }
  }

  // حالة ب: رحلة تركيز نشطة
  if (sessionType === 'flight' && sessionData?.flight) {
    const f = sessionData.flight
    const arrivalSec = f.estimatedArrival
    const remSec = arrivalSec - nowSec
    if (remSec > 0) {
      const remMins = Math.floor(remSec / 60)
      const totalSec = f.initialSeconds || f.totalSeconds || (remSec > 0 ? remSec : 3600)
      const elapsedSec = Math.max(0, totalSec - remSec)
      const pct = Math.min(100, Math.max(0, Math.round((elapsedSec / totalSec) * 100)))
      const route = `${f.origin} → ${f.destination}`
      const timeSub = remMins > 60 ? `${Math.floor(remMins / 60)}h ${remMins % 60}m left` : `${remMins} min left`

      return {
        kind: 'flight',
        tag: 'Flight',
        line: `${route} · in the air`,
        right: remMins > 60 ? `${Math.floor(remMins / 60)}h` : `${remMins} min`,
        status: hasMusic ? 'Flying · listening to Spotify' : 'On a focus flight',
        label: 'FOCUS FLIGHT',
        big: route,
        bigSize: 38,
        sub: `${f.airline || 'Flight'} · ${timeSub}`,
        pct,
        hasBar: true,
        barL: f.origin,
        barR: f.destination,
        hasChips: false,
        chips: [],
        hasDots: false,
        dots: [],
        action: 'Hop on this flight',
        together: togetherStr,
        hasMusicBadge: hasMusic,
        hasSec: hasMusic,
        secTitle: spotifyTrack?.title || '',
        secSub: spotifyTrack?.artist ? `${spotifyTrack.artist} · on Spotify` : '',
        secPct: spotifyTrack?.progressPct || 0,
      }
    }
  }

  // حالة ج: يستمع إلى سبوتيفاي حالياً
  if (hasMusic && spotifyTrack) {
    return {
      kind: 'music',
      tag: 'Music',
      line: `Listening to ${spotifyTrack.title} · ${spotifyTrack.artist}`,
      right: 'on Spotify',
      status: 'Listening to Spotify',
      label: 'SPOTIFY NOW',
      big: spotifyTrack.title,
      bigSize: 34,
      sub: `${spotifyTrack.artist} · on Spotify`,
      pct: spotifyTrack.progressPct || 50,
      hasBar: true,
      barL: 'Spotify',
      barR: 'Playing',
      hasChips: false,
      chips: [],
      hasDots: false,
      dots: [],
      action: 'Listen along',
      together: togetherStr,
      hasMusicBadge: true,
      hasSec: true,
      secTitle: spotifyTrack.title,
      secSub: `${spotifyTrack.artist} · on Spotify`,
      secPct: spotifyTrack.progressPct || 50,
    }
  }

  // حالة د: محاضرة أو عادة مجدولة قائمة حالياً
  if (Array.isArray(user.habits) && user.habits.length > 0) {
    const currentDay = new Date().getDay()
    const currentMinutesOfDay = new Date().getHours() * 60 + new Date().getMinutes()

    for (const h of user.habits) {
      if (h.isPrivate) continue
      if (h.time && Array.isArray(h.scheduleDays) && h.scheduleDays.includes(currentDay)) {
        const [timePart, meridiem] = h.time.split(' ')
        if (timePart) {
          let [hHour, hMin] = timePart.split(':').map(Number)
          if (meridiem === 'PM' && hHour < 12) hHour += 12
          if (meridiem === 'AM' && hHour === 12) hHour = 0
          const startMinutes = hHour * 60 + (hMin || 0)
          const durationMins = parseInt(h.duration) || 60
          const endMinutes = startMinutes + durationMins

          if (currentMinutesOfDay >= startMinutes && currentMinutesOfDay <= endMinutes) {
            const leftMins = endMinutes - currentMinutesOfDay
            return {
              kind: 'lecture',
              tag: 'Lecture',
              line: `In lecture · ${h.name}${h.location ? ` · ${h.location}` : ''}`,
              right: `${leftMins} min`,
              status: 'In a lecture',
              label: 'IN LECTURE',
              big: h.name,
              bigSize: 42,
              sub: `Ends in ${leftMins} min`,
              pct: Math.round(((currentMinutesOfDay - startMinutes) / durationMins) * 100),
              hasBar: false,
              barL: '',
              barR: '',
              hasChips: true,
              chips: [h.time, h.location, h.frequency].filter(Boolean),
              hasDots: false,
              dots: [],
              action: 'Plan a study session',
              together: togetherStr,
              hasMusicBadge: false,
              hasSec: false,
            }
          }
        }
      }
    }
  }

  // حالة هـ: عادات مجدولة لليوم (حتى لو المستخدم أوفلاين وغير نشط)
  if (Array.isArray(user.habits) && user.habits.length > 0) {
    const currentDay = new Date().getDay()
    const todayDateStr = new Date().toISOString().split('T')[0]

    const publicScheduledHabits = user.habits.filter(h => {
      if (h.isPrivate) return false
      const isScheduled = (h.frequency && h.frequency !== 'daily') || !!h.time || !!h.duration || !!h.location || (h.frequency === 'once' && !!h.scheduleDate)
      if (!isScheduled) return false

      if (h.frequency === 'weekly' && Array.isArray(h.scheduleDays)) {
        return h.scheduleDays.includes(currentDay)
      }
      if (h.frequency === 'once') {
        return h.scheduleDate === todayDateStr
      }
      return true
    })

    if (publicScheduledHabits.length > 0) {
      const h = publicScheduledHabits[0]
      return {
        kind: 'scheduled',
        tag: 'Scheduled',
        line: `Scheduled · ${h.name}${h.time ? ` at ${h.time}` : ''}`,
        right: h.time || 'Today',
        status: `Scheduled today: ${h.name}`,
        label: 'SCHEDULED HABIT',
        big: h.name,
        bigSize: 36,
        sub: `${h.time ? `${h.time}` : 'Scheduled today'}${h.location ? ` · ${h.location}` : ''}`,
        pct: 0,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: true,
        chips: [h.time, h.location, h.frequency].filter(Boolean),
        hasDots: false,
        dots: [],
        action: 'Ask to study',
        together: togetherStr,
        hasMusicBadge: false,
        hasSec: false,
      }
    }
  }

  // حالة و: عادات تم إنجازها اليوم
  if (todayCompletedHabitsCount > 0) {
    const habitDisplay = lastCompletedHabitName || 'Habits'
    return {
      kind: 'habit',
      tag: 'Habit',
      line: `Finished ${habitDisplay} (${todayCompletedHabitsCount}/${todayTotalHabits})`,
      right: `${todayCompletedHabitsCount}/${todayTotalHabits}`,
      status: 'Finished a habit',
      label: 'HABITS TODAY',
      big: `${habitDisplay} ${todayCompletedHabitsCount}/${todayTotalHabits}`,
      bigSize: 38,
      sub: `Completed ${todayCompletedHabitsCount} of ${todayTotalHabits} habits today`,
      pct: 100,
      hasBar: false,
      barL: '',
      barR: '',
      hasChips: false,
      chips: [],
      hasDots: true,
      dots: Array.from({ length: Math.min(5, Math.max(todayTotalHabits, 1)) }, (_, i) =>
        i < todayCompletedHabitsCount ? 1 : 0
      ),
      action: 'Cheer them on',
      together: togetherStr,
      hasMusicBadge: false,
      hasSec: false,
    }
  }

  // حالة هـ: غير نشط / في وضع الخمول (IDLE)
  const lastActiveDate = user.updatedAt ? new Date(user.updatedAt).getTime() : 0
  const diffMs = Math.max(0, nowMs - lastActiveDate)

  let lastSeenText = 'Active just now'
  let rightText = 'Now'

  if (diffMs > 24 * 3600 * 1000) {
    const days = Math.floor(diffMs / (24 * 3600 * 1000))
    lastSeenText = `Last seen ${days}d ago`
    rightText = `${days}d`
  } else if (diffMs > 3600 * 1000) {
    const hours = Math.floor(diffMs / (3600 * 1000))
    lastSeenText = `Last seen ${hours}h ago`
    rightText = `${hours}h`
  } else if (diffMs > 3 * 60 * 1000) {
    const mins = Math.floor(diffMs / (60 * 1000))
    lastSeenText = `Last seen ${mins}m ago`
    rightText = `${mins}m`
  }

  return {
    kind: 'idle',
    tag: 'Idle',
    line: `Idle · ${lastSeenText.toLowerCase()}`,
    right: rightText,
    status: 'Not active',
    label: 'IDLE',
    big: lastSeenText,
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
    together: togetherStr,
    hasMusicBadge: false,
    hasSec: false,
  }
}

export const json = (data, status = 200, req = null) =>
  NextResponse.json(data, {
    status,
    headers: req ? getCorsHeaders(req) : undefined,
  })

export { handleCorsOptions as OPTIONS }

export const normUsername = (v) =>
  String(v ?? '').trim().toLowerCase().replace(/^@/, '')

// المستخدم الحالي أو null (بيرفض المحظورين من الأدمن)
export async function requireMe(req) {
  const me = await getCurrentDbUser(req)
  if (!me || me.isBlocked) return null
  return me
}

// صف الصداقة بين اتنين في أي اتجاه
export const findBetween = (db, a, b) =>
  db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  })

// Rate limit بسيط في الذاكرة (best-effort على Vercel لأن كل instance له ذاكرته)
const hits = new Map()
export function rateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now); hits.set(key, arr); return true
}
