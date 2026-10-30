import { prisma } from '@/lib/prisma'
import { json, requireMe, normUsername, OPTIONS } from '@/lib/friends'
import { rateLimit, getClientIp } from '@/lib/rateLimit'

export { OPTIONS }

const ALLOWED_NUDGE_TYPES = ['nudge', 'poke', 'cheer', 'study']

export async function POST(req) {
  const ip = getClientIp(req)
  if (!await rateLimit(`nudge-ip:${ip}`, 20, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  if (!await rateLimit(`nudge:${me.id}`, 10, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  try {
    const body = await req.json().catch(() => ({}))
    const targetUsername = normUsername(body?.username)
    const rawType = body?.type || 'nudge'
    const type = ALLOWED_NUDGE_TYPES.includes(rawType) ? rawType : 'nudge'

    if (!targetUsername) {
      return json({ error: 'missing_username' }, 400, req)
    }

    const targetUser = await prisma.user.findUnique({
      where: { username: targetUsername }
    })

    if (!targetUser) {
      return json({ error: 'user_not_found' }, 404, req)
    }

    if (!await rateLimit(`nudge-target:${me.id}:${targetUser.id}`, 4, 60_000)) {
      return json({ error: 'Please wait before nudging this friend again.' }, 429, req)
    }

    // Verify friendship status is accepted
    const friendship = await prisma.friendship.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { requesterId: me.id, addresseeId: targetUser.id },
          { requesterId: targetUser.id, addresseeId: me.id },
        ]
      }
    })

    if (!friendship) {
      return json({ error: 'not_friends' }, 403, req)
    }

    // Create notification item
    const notifItem = {
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      type,
      fromUsername: me.username || 'friend',
      fromName: me.name || me.username || 'Friend',
      fromAvatar: me.avatar || 'user',
      createdAt: Date.now(),
      read: false
    }

    const existingNotifs = Array.isArray(targetUser.notifications) ? targetUser.notifications : []
    const updatedNotifs = [notifItem, ...existingNotifs].slice(0, 30)

    await prisma.user.update({
      where: { id: targetUser.id },
      data: { notifications: updatedNotifs }
    })

    return json({ success: true, notification: notifItem }, 200, req)
  } catch (err) {
    console.error('[Nudge Error]:', err)
    return json({ error: 'internal_error' }, 500, req)
  }
}
