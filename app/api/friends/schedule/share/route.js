import { prisma } from '@/lib/prisma'
import { json, requireMe, findBetween, OPTIONS, rateLimit, getClientIp } from '@/lib/friends'

export { OPTIONS }

export async function POST(req) {
  const ip = getClientIp(req)
  if (!await rateLimit(`friend-schedule-share-ip:${ip}`, 30, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  if (!await rateLimit(`friend-schedule-share-user:${me.id}`, 30, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  let body
  try {
    body = await req.json()
  } catch (_) {
    return json({ error: 'invalid_json' }, 400, req)
  }

  const { targetUsername, action = 'share' } = body || {}
  const cleanTarget = String(targetUsername || '').trim().toLowerCase()

  if (!cleanTarget) {
    return json({ error: 'target_username_required' }, 400, req)
  }

  if (me.username && me.username.toLowerCase() === cleanTarget) {
    return json({ error: 'cannot_share_with_self' }, 400, req)
  }

  // 1. Find target user
  const targetUser = await prisma.user.findFirst({
    where: {
      username: { equals: cleanTarget, mode: 'insensitive' }
    },
    select: {
      id: true,
      username: true,
      name: true,
      avatar: true,
      notifications: true,
      isBlocked: true
    }
  })

  if (!targetUser || targetUser.isBlocked) {
    return json({ error: 'user_not_found' }, 404, req)
  }

  // 2. Verify friendship is accepted
  const friendship = await findBetween(prisma, me.id, targetUser.id)
  if (!friendship || friendship.status !== 'accepted') {
    return json({ error: 'not_friends' }, 403, req)
  }

  // 3. Update me.privacySettings
  const currentPrivacy = (me.privacySettings && typeof me.privacySettings === 'object')
    ? { ...me.privacySettings }
    : {}

  let sharedList = Array.isArray(currentPrivacy.sharedScheduleUsers)
    ? [...currentPrivacy.sharedScheduleUsers]
    : []

  const targetUname = targetUser.username

  if (action === 'share') {
    if (!sharedList.includes(targetUname)) {
      sharedList.push(targetUname)
    }
  } else {
    sharedList = sharedList.filter(u => String(u || '').toLowerCase() !== targetUname.toLowerCase())
  }

  currentPrivacy.sharedScheduleUsers = sharedList

  await prisma.user.update({
    where: { id: me.id },
    data: { privacySettings: currentPrivacy }
  })

  // 4. Send in-app notification to targetUser when sharing
  if (action === 'share') {
    const notifItem = {
      id: 'notif_sched_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type: 'schedule_share',
      fromUsername: me.username || 'friend',
      fromName: me.name || me.username || 'Friend',
      fromAvatar: me.avatar || 'user',
      createdAt: Date.now(),
      read: false
    }

    const existingNotifs = Array.isArray(targetUser.notifications) ? targetUser.notifications : []
    const updatedNotifs = [
      notifItem,
      ...existingNotifs.filter(n => !(n.type === 'schedule_share' && n.fromUsername === me.username))
    ].slice(0, 30)

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { notifications: updatedNotifs }
    })
  }

  return json({
    success: true,
    action,
    shared: action === 'share',
    targetUsername: targetUser.username
  }, 200, req)
}
