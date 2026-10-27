import { prisma } from '@/lib/prisma'
import { PUBLIC_SELECT, pub, json, requireMe, OPTIONS } from '@/lib/friends'

export { OPTIONS }

// GET /api/friends -> { friends, incoming, outgoing, blocked }
export async function GET(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  const include = {
    requester: { select: PUBLIC_SELECT },
    addressee: { select: PUBLIC_SELECT },
  }

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
    include,
    orderBy: { updatedAt: 'desc' },
  })

  const out = { friends: [], incoming: [], outgoing: [], blocked: [] }
  for (const r of rows) {
    const iAmRequester = r.requesterId === me.id
    const other = pub(iAmRequester ? r.addressee : r.requester)
    const item = { friendshipId: r.id, user: other }

    if (r.status === 'accepted') out.friends.push(item)
    else if (r.status === 'pending') (iAmRequester ? out.outgoing : out.incoming).push(item)
    else if (r.status === 'blocked' && iAmRequester) out.blocked.push(item)
    // لو هو اللي عملّي Block: مبنعرضوش خالص
  }
  return json(out, 200, req)
}
