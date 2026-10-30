import { prisma } from '@/lib/prisma'
import { PUBLIC_SELECT, PRESENCE_SELECT, pub, json, requireMe, computeRealPresence, OPTIONS, rateLimit, getClientIp } from '@/lib/friends'

export { OPTIONS }

// GET /api/friends -> { friends, incoming, outgoing, blocked }
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

  const include = {
    requester: { select: PRESENCE_SELECT },
    addressee: { select: PRESENCE_SELECT },
  }

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
    include,
    orderBy: { updatedAt: 'desc' },
  })

  const out = { 
    friends: [], 
    incoming: [], 
    outgoing: [], 
    blocked: [],
    notifications: Array.isArray(me.notifications) ? me.notifications : []
  }
  for (const r of rows) {
    const iAmRequester = r.requesterId === me.id
    const otherUser = iAmRequester ? r.addressee : r.requester
    const other = pub(otherUser)

    if (r.status === 'accepted') {
      const presence = computeRealPresence(otherUser, r)
      out.friends.push({ friendshipId: r.id, user: other, presence })
    } else if (r.status === 'pending') {
      const item = { friendshipId: r.id, user: other }
      ;(iAmRequester ? out.outgoing : out.incoming).push(item)
    } else if (r.status === 'blocked' && iAmRequester) {
      const item = { friendshipId: r.id, user: other }
      out.blocked.push(item)
    }
    // لو هو اللي عملّي Block: مبنعرضوش خالص
  }
  return json(out, 200, req)
}
