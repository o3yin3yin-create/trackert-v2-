import { prisma } from '@/lib/prisma'
import { json, requireMe, OPTIONS } from '@/lib/friends'

export { OPTIONS }

// POST /api/friends/respond  { friendshipId, action: 'accept' | 'decline' }
export async function POST(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  const { friendshipId, action } = await req.json().catch(() => ({}))
  if (!friendshipId || !['accept', 'decline'].includes(action))
    return json({ error: 'bad_request' }, 400, req)

  // بس المستلم يقدر يرد، وبس على طلب pending
  const where = { id: String(friendshipId), addresseeId: me.id, status: 'pending' }

  const res =
    action === 'accept'
      ? await prisma.friendship.updateMany({ where, data: { status: 'accepted' } })
      : await prisma.friendship.deleteMany({ where })

  if (res.count === 0) return json({ error: 'not_found' }, 404, req)
  return json({ ok: true }, 200, req)
}
