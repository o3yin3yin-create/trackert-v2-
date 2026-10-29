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
  timezone: true,
  privacySettings: true,
  activeSessionType: true,
  activeSessionData: true,
  habits: {
    select: {
      id: true,
      name: true,
      category: true,
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

// دالة استنتاج وسرد تفاصيل نوع النشاط المجدول (محاضرة، ميتنج، امتحان، دراسة، إلخ)
function getCategoryInfo(category, habitName) {
  const nameLower = String(habitName || '').toLowerCase()
  let cat = String(category || '').trim().toLowerCase()
  
  if (!cat || cat === 'habit' || cat === 'other') {
    if (nameLower.includes('lecture') || nameLower.includes('محاضر') || nameLower.includes('class') || nameLower.includes('درس')) cat = 'lecture'
    else if (nameLower.includes('meeting') || nameLower.includes('ميتنج') || nameLower.includes('اجتماع') || nameLower.includes('sync')) cat = 'meeting'
    else if (nameLower.includes('exam') || nameLower.includes('امتحان') || nameLower.includes('quiz') || nameLower.includes('midterm') || nameLower.includes('فاينل')) cat = 'exam'
    else if (nameLower.includes('study') || nameLower.includes('مذاكر') || nameLower.includes('study session')) cat = 'study'
    else if (nameLower.includes('gym') || nameLower.includes('workout') || nameLower.includes('جيم') || nameLower.includes('تمرين')) cat = 'workout'
    else cat = 'lecture' // افتراضياً أي نشاط أسبوعي محدد بالوقت والمدة هو محاضرة
  }

  if (cat === 'lecture') {
    return {
      tag: 'Lecture',
      label: 'IN LECTURE',
      scheduledLabel: 'SCHEDULED LECTURE',
      ongoingStatus: `In lecture: ${habitName}`,
      scheduledStatus: (time) => time ? `Lecture at ${time}: ${habitName}` : `Scheduled lecture: ${habitName}`,
      ongoingLine: `In lecture · ${habitName}`,
      scheduledLine: (time) => `Lecture · ${habitName}${time ? ` at ${time}` : ''}`,
    }
  }
  if (cat === 'meeting') {
    return {
      tag: 'Meeting',
      label: 'IN MEETING',
      scheduledLabel: 'SCHEDULED MEETING',
      ongoingStatus: `In meeting: ${habitName}`,
      scheduledStatus: (time) => time ? `Meeting at ${time}: ${habitName}` : `Scheduled meeting: ${habitName}`,
      ongoingLine: `In meeting · ${habitName}`,
      scheduledLine: (time) => `Meeting · ${habitName}${time ? ` at ${time}` : ''}`,
    }
  }
  if (cat === 'exam') {
    return {
      tag: 'Exam',
      label: 'IN EXAM',
      scheduledLabel: 'SCHEDULED EXAM',
      ongoingStatus: `In exam: ${habitName}`,
      scheduledStatus: (time) => time ? `Exam at ${time}: ${habitName}` : `Scheduled exam: ${habitName}`,
      ongoingLine: `In exam · ${habitName}`,
      scheduledLine: (time) => `Exam · ${habitName}${time ? ` at ${time}` : ''}`,
    }
  }
  if (cat === 'study') {
    return {
      tag: 'Study',
      label: 'IN STUDY SESSION',
      scheduledLabel: 'SCHEDULED STUDY',
      ongoingStatus: `Studying: ${habitName}`,
      scheduledStatus: (time) => time ? `Study session at ${time}: ${habitName}` : `Scheduled study: ${habitName}`,
      ongoingLine: `Studying · ${habitName}`,
      scheduledLine: (time) => `Study · ${habitName}${time ? ` at ${time}` : ''}`,
    }
  }
  if (cat === 'workout') {
    return {
      tag: 'Workout',
      label: 'IN WORKOUT',
      scheduledLabel: 'SCHEDULED WORKOUT',
      ongoingStatus: `Working out: ${habitName}`,
      scheduledStatus: (time) => time ? `Workout at ${time}: ${habitName}` : `Scheduled workout: ${habitName}`,
      ongoingLine: `Working out · ${habitName}`,
      scheduledLine: (time) => `Workout · ${habitName}${time ? ` at ${time}` : ''}`,
    }
  }

  const customTag = category && category !== 'habit' ? category : 'Habit'
  return {
    tag: customTag,
    label: customTag === 'Habit' ? 'SCHEDULED HABIT' : `IN ${customTag.toUpperCase()}`,
    scheduledLabel: customTag === 'Habit' ? 'SCHEDULED HABIT' : `SCHEDULED ${customTag.toUpperCase()}`,
    ongoingStatus: `In ${customTag.toLowerCase()}: ${habitName}`,
    scheduledStatus: (time) => time ? `${customTag} at ${time}: ${habitName}` : `Scheduled today: ${habitName}`,
    ongoingLine: `In ${customTag.toLowerCase()} · ${habitName}`,
    scheduledLine: (time) => `${customTag} · ${habitName}${time ? ` at ${time}` : ''}`,
  }
}

// دالة حساب الـ Presence الحقيقي بناءً على النشاط الفعلي للمستخدم وإعدادات خصوصيته
export function computeRealPresence(user, friendship = null) {
  if (!user) return null
  const nowMs = Date.now()
  const nowSec = Math.floor(nowMs / 1000)

  // 1. حساب وقت المستخدم الحالي بدقة بحسب منطقته الزمنية (الافتراضي Africa/Cairo)
  const tz = user.timezone || 'Africa/Cairo'
  let nowInTz = new Date()
  try {
    nowInTz = new Date(new Date().toLocaleString('en-US', { timeZone: tz }))
  } catch (_) {
    nowInTz = new Date()
  }
  const currentDay = nowInTz.getDay()
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
  const isDayMatched = (daysArr) => {
    if (!Array.isArray(daysArr)) return false
    return daysArr.some((d) => d === currentDay || Number(d) === currentDay || String(d).toLowerCase() === dayNames[currentDay])
  }
  const currentMinutesOfDay = nowInTz.getHours() * 60 + nowInTz.getMinutes()
  const todayStr = `${nowInTz.getFullYear()}-${String(nowInTz.getMonth() + 1).padStart(2, '0')}-${String(nowInTz.getDate()).padStart(2, '0')}`

  // 2. قراءة إعدادات الخصوصية
  const priv = (user.privacySettings && typeof user.privacySettings === 'object') ? user.privacySettings : {}
  const allowFocusSessions = priv.focusSessions !== false
  const allowFocusFlights = priv.focusFlights !== false
  const allowScheduledHabits = priv.scheduledHabits !== false && priv.lectures !== false
  const allowSpotify = priv.spotify !== false
  const allowHabits = priv.habits !== false

  // 3. حساب وقت المذاكرة المشترك الفعلي المسجل بين الصديقين
  const sharedSec = typeof friendship?.togetherSeconds === 'number' ? friendship.togetherSeconds : 0
  const hoursTogether = Math.floor(sharedSec / 3600)
  const minsTogether = Math.floor((sharedSec % 3600) / 60)
  const togetherStr = hoursTogether > 0 
    ? `${hoursTogether}h ${minsTogether}m`
    : minsTogether > 0 
    ? `${minsTogether}m` 
    : '0m'

  // دالة توليد حالة الخمول (IDLE)
  const getIdleResponse = () => {
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

  // إذا تم تفعيل وضع التخفي (Ghost Mode)، يظهر كـ Idle فوراً
  if (priv.ghostMode === true) {
    return getIdleResponse()
  }

  // 4. فحص عادات اليوم المكتملة
  let todayCompletedHabitsCount = 0
  let todayTotalHabits = Array.isArray(user.habits) ? user.habits.length : 0
  let lastCompletedHabitName = null

  if (allowHabits && Array.isArray(user.dailyLogs)) {
    for (const log of user.dailyLogs) {
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

  // 5. فحص الجلسة النشطة والموسيقى
  const sessionType = user.activeSessionType
  const sessionData = user.activeSessionData
  const spotifyTrack = sessionData?.spotifyTrack
  const hasMusic = Boolean(
    allowSpotify &&
    spotifyTrack?.title &&
    spotifyTrack?.isPlaying &&
    (nowMs - (spotifyTrack.updatedAt || nowMs) < 6 * 60 * 1000)
  )

  // حالة أ: جلسة تركيز / بومودورو نشطة (إذا سمحت الخصوصية)
  if (allowFocusSessions && sessionType === 'pomodoro' && sessionData?.endTime) {
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
        sessionData: {
          type: 'pomodoro',
          initialTime: initialSec,
          remainingSec: remainingSec,
          taskName: taskName,
          step: step,
          totalCycles: totalCycles
        },
        together: togetherStr,
        hasMusicBadge: hasMusic,
        hasSec: hasMusic,
        secTitle: spotifyTrack?.title || '',
        secSub: spotifyTrack?.artist ? `${spotifyTrack.artist} · on Spotify` : '',
        secPct: spotifyTrack?.progressPct || 0,
        secArt: spotifyTrack?.albumArt || null,
      }
    }
  }

  // حالة ب: رحلة تركيز نشطة (إذا سمحت الخصوصية)
  if (allowFocusFlights && sessionType === 'flight' && sessionData?.flight) {
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
        sessionData: {
          type: 'flight',
          flight: f,
          remainingSec: remSec
        },
        together: togetherStr,
        hasMusicBadge: hasMusic,
        hasSec: hasMusic,
        secTitle: spotifyTrack?.title || '',
        secSub: spotifyTrack?.artist ? `${spotifyTrack.artist} · on Spotify` : '',
        secPct: spotifyTrack?.progressPct || 0,
        secArt: spotifyTrack?.albumArt || null,
      }
    }
  }

  // حالة ج: محاضرة أو ميتنج أو امتحان أو عادة قائمة حالياً في ميعادها
  if (allowScheduledHabits && Array.isArray(user.habits) && user.habits.length > 0) {
    for (const h of user.habits) {
      if (h.isPrivate) continue

      let isForToday = false
      if (h.frequency === 'daily') isForToday = true
      else if (h.frequency === 'weekly') isForToday = isDayMatched(h.scheduleDays)
      else if (h.frequency === 'once' && h.scheduleDate) isForToday = h.scheduleDate === todayStr

      if (!isForToday) continue

      if (h.time) {
        const [timePart, meridiem] = h.time.trim().split(' ')
        if (timePart) {
          let [hHour, hMin] = timePart.split(':').map(Number)
          if (meridiem === 'PM' && hHour < 12) hHour += 12
          if (meridiem === 'AM' && hHour === 12) hHour = 0
          const startMinutes = hHour * 60 + (hMin || 0)

          let durationMins = 60
          if (h.duration) {
            const rawDur = String(h.duration).toLowerCase()
            if (rawDur.includes('h')) {
              const hNum = parseFloat(rawDur) || 1
              durationMins = Math.round(hNum * 60)
            } else {
              durationMins = parseInt(rawDur) || 60
            }
          }
          const endMinutes = startMinutes + durationMins

          if (currentMinutesOfDay >= startMinutes && currentMinutesOfDay <= endMinutes) {
            const leftMins = endMinutes - currentMinutesOfDay
            const catInfo = getCategoryInfo(h.category, h.name)
            return {
              kind: 'lecture',
              tag: catInfo.tag,
              line: `${catInfo.ongoingLine}${h.location ? ` · ${h.location}` : ''}`,
              right: `${leftMins} min`,
              status: (allowSpotify && hasMusic) ? `${catInfo.ongoingStatus} · listening to Spotify` : catInfo.ongoingStatus,
              label: catInfo.label,
              big: h.name,
              bigSize: 42,
              sub: `Ends in ${leftMins} min${h.location ? ` · ${h.location}` : ''}`,
              pct: Math.min(100, Math.max(0, Math.round(((currentMinutesOfDay - startMinutes) / durationMins) * 100))),
              hasBar: false,
              barL: '',
              barR: '',
              hasChips: true,
              chips: [h.time, h.location, catInfo.tag].filter(Boolean),
              hasDots: false,
              dots: [],
              action: 'Ask to study',
              together: togetherStr,
              hasMusicBadge: allowSpotify && hasMusic,
              hasSec: allowSpotify && hasMusic,
              secTitle: spotifyTrack?.title || '',
              secSub: spotifyTrack?.artist ? `${spotifyTrack.artist} · on Spotify` : '',
              secPct: spotifyTrack?.progressPct || 0,
              secArt: spotifyTrack?.albumArt || null,
            }
          }
        }
      }
    }
  }

  // حالة د: يستمع إلى سبوتيفاي حالياً (إذا سمحت الخصوصية)
  if (allowSpotify && hasMusic && spotifyTrack) {
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
      art: spotifyTrack.albumArt || null,
      secTitle: spotifyTrack.title,
      secSub: `${spotifyTrack.artist} · on Spotify`,
      secPct: spotifyTrack.progressPct || 50,
      secArt: spotifyTrack.albumArt || null,
    }
  }

  // حالة هـ: عادات أو محاضرات أو اجتماعات مجدولة لليوم
  if (allowScheduledHabits && Array.isArray(user.habits) && user.habits.length > 0) {
    const publicScheduledHabits = user.habits.filter(h => {
      if (h.isPrivate) return false
      const isScheduled = (h.frequency && h.frequency !== 'daily') || !!h.time || !!h.duration || !!h.location || (h.frequency === 'once' && !!h.scheduleDate)
      if (!isScheduled) return false

      if (h.frequency === 'weekly') {
        return isDayMatched(h.scheduleDays)
      }
      if (h.frequency === 'once') {
        return h.scheduleDate === todayStr
      }
      return true
    })

    if (publicScheduledHabits.length > 0) {
      const h = publicScheduledHabits[0]
      const catInfo = getCategoryInfo(h.category, h.name)
      return {
        kind: 'scheduled',
        tag: catInfo.tag,
        line: `${catInfo.scheduledLine(h.time)}${h.location ? ` · ${h.location}` : ''}`,
        right: h.time || 'Today',
        status: catInfo.scheduledStatus(h.time),
        label: catInfo.scheduledLabel,
        big: h.name,
        bigSize: 36,
        sub: `${h.time ? `${h.time}` : 'Scheduled today'}${h.location ? ` · ${h.location}` : ''}`,
        pct: 0,
        hasBar: false,
        barL: '',
        barR: '',
        hasChips: true,
        chips: [h.time, h.location, catInfo.tag].filter(Boolean),
        hasDots: false,
        dots: [],
        action: 'Ask to study',
        together: togetherStr,
        hasMusicBadge: false,
        hasSec: false,
      }
    }
  }

  // حالة و: عادات تم إنجازها اليوم (إذا وفقط إذا كانت الخصوصية تسمح بعرض العادات المكتملة)
  if (allowHabits && todayCompletedHabitsCount > 0) {
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

  // حالة ختامية: غير نشط / في وضع الخمول
  return getIdleResponse()
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

export { rateLimit } from '@/lib/rateLimit'
