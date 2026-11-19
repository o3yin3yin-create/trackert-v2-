import { prisma } from '@/lib/prisma'
import { PRESENCE_SELECT, pub, json, requireMe, computeRealPresence, OPTIONS, rateLimit, getClientIp } from '@/lib/friends'

export { OPTIONS }

const globalForFriendsCache = globalThis
if (!globalForFriendsCache.__bokraFriendsListCache) {
  globalForFriendsCache.__bokraFriendsListCache = new Map() // userId -> { payload, expiresAt }
}
const friendsCache = globalForFriendsCache.__bokraFriendsListCache
const FRIENDS_CACHE_TTL_MS = 20_000 // 20s RAM cache cuts polling DB egress by ~80%

// GET /api/friends -> { friends, incoming, outgoing, blocked, notifications }
export async function GET(req) {
  const ip = getClientIp(req)
  if (!await rateLimit(`friends-list-ip:${ip}`, 60, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  if (!await rateLimit(`friends-list-user:${me.id}`, 60, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  const now = Date.now()
  const cached = friendsCache.get(me.id)
  if (cached && cached.expiresAt > now) {
    return json({
      ...cached.payload,
      notifications: Array.isArray(me.notifications) ? me.notifications : [],
    }, 200, req)
  }

  // 1. Fetch scalar friendship rows only (avoids fetching me's avatar/habits/logs N times)
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
    orderBy: { updatedAt: 'desc' },
  })

  const otherUserIds = [...new Set(
    rows.map((r) => (r.requesterId === me.id ? r.addresseeId : r.requesterId))
  )]

  // 2. Fetch each otherUser once
  const otherUsers = otherUserIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: otherUserIds } },
        select: { id: true, ...PRESENCE_SELECT },
      })
    : []
  const userById = new Map(otherUsers.map((u) => [u.id, u]))

  const out = {
    friends: [],
    incoming: [],
    outgoing: [],
    blocked: [],
    notifications: Array.isArray(me.notifications) ? me.notifications : [],
  }

  const myPriv = (me.privacySettings && typeof me.privacySettings === 'object')
    ? me.privacySettings
    : {}
  const mySharedList = Array.isArray(myPriv.sharedScheduleUsers) ? myPriv.sharedScheduleUsers : []

  for (const r of rows) {
    const iAmRequester = r.requesterId === me.id
    const otherId = iAmRequester ? r.addresseeId : r.requesterId
    const otherUser = userById.get(otherId)
    if (!otherUser) continue
    const other = pub(otherUser)

    if (r.status === 'accepted') {
      const presence = computeRealPresence(otherUser, r)

      const otherPriv = (otherUser.privacySettings && typeof otherUser.privacySettings === 'object')
        ? otherUser.privacySettings
        : {}
      const otherSharedList = Array.isArray(otherPriv.sharedScheduleUsers) ? otherPriv.sharedScheduleUsers : []
      const hasSharedWithMe = Boolean(
        me.username && otherSharedList.some((u) => String(u || '').toLowerCase() === me.username.toLowerCase())
      )
      const iSharedWithThem = Boolean(
        otherUser.username && mySharedList.some((u) => String(u || '').toLowerCase() === otherUser.username.toLowerCase())
      )

      const userWithSchedule = {
        ...other,
        hasSharedScheduleWithMe: hasSharedWithMe,
        iSharedScheduleWithThem: iSharedWithThem,
        weeklySchedule: hasSharedWithMe
          ? (Array.isArray(otherUser.habits) ? otherUser.habits.filter((h) => !h.isPrivate) : [])
          : [],
      }

      out.friends.push({ friendshipId: r.id, user: userWithSchedule, presence })
    } else if (r.status === 'pending') {
      const item = { friendshipId: r.id, user: other }
      ;(iAmRequester ? out.outgoing : out.incoming).push(item)
    } else if (r.status === 'blocked' && iAmRequester) {
      const item = { friendshipId: r.id, user: other }
      out.blocked.push(item)
    }
  }

  friendsCache.set(me.id, {
    payload: {
      friends: out.friends,
      incoming: out.incoming,
      outgoing: out.outgoing,
      blocked: out.blocked,
    },
    expiresAt: now + FRIENDS_CACHE_TTL_MS,
  })

  return json(out, 200, req)
}
