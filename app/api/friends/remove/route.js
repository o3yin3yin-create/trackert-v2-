import { prisma } from '@/lib/prisma'
import { json, requireMe, OPTIONS } from '@/lib/friends'

export { OPTIONS }

// POST /api/friends/remove  { friendshipId, action: 'remove' | 'block' | 'unblock' }
export async function POST(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  const { friendshipId, action } = await req.json().catch(() => ({}))
  if (!friendshipId || !['remove', 'block', 'unblock'].includes(action))
    return json({ error: 'bad_request' }, 400, req)

  // لازم أكون طرف في الصف
  const row = await prisma.friendship.findFirst({
    where: {
      id: String(friendshipId),
      OR: [{ requesterId: me.id }, { addresseeId: me.id }],
    },
  })
  if (!row) return json({ error: 'not_found' }, 404, req)

  const otherId = row.requesterId === me.id ? row.addresseeId : row.requesterId

  if (action === 'remove') {
    // حذف صديق أو إلغاء طلب. مفيش حذف لـ Block من الطرف المحظور
    if (row.status === 'blocked') return json({ error: 'not_found' }, 404, req)
    await prisma.friendship.delete({ where: { id: row.id } })
    return json({ ok: true }, 200, req)
  }

  if (action === 'unblock') {
    if (row.status !== 'blocked' || row.requesterId !== me.id)
      return json({ error: 'not_found' }, 404, req)
    await prisma.friendship.delete({ where: { id: row.id } })
    return json({ ok: true }, 200, req)
  }

  // block
  if (row.status === 'blocked') {
    return row.requesterId === me.id ? json({ ok: true }, 200, req) : json({ error: 'not_found' }, 404, req)
  }
  await prisma.$transaction([
    prisma.friendship.delete({ where: { id: row.id } }),
    prisma.friendship.create({
      data: { requesterId: me.id, addresseeId: otherId, status: 'blocked' },
    }),
  ])
  return json({ ok: true }, 200, req)
}
