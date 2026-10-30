import { prisma } from '@/lib/prisma'
import { json, normUsername, requireMe, findBetween, rateLimit, getClientIp, OPTIONS } from '@/lib/friends'

export { OPTIONS }

// POST /api/friends/request  { username }
export async function POST(req) {
  const ip = getClientIp(req)
  if (!await rateLimit(`request-ip:${ip}`, 20, 60_000)) return json({ error: 'too_many_requests' }, 429, req)

  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)
  if (!await rateLimit(`request:${me.id}`, 15)) return json({ error: 'too_many_requests' }, 429, req)

  const body = await req.json().catch(() => ({}))
  const uname = normUsername(body.username)

  const target = await prisma.user.findUnique({
    where: { username: uname },
    select: { id: true, isBlocked: true },
  })
  // نفس الرد لو مش موجود أو نفسي أو محظور
  if (!target || target.id === me.id || target.isBlocked)
    return json({ error: 'not_available' }, 404, req)

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const row = await findBetween(tx, me.id, target.id)

        if (!row) {
          await tx.friendship.create({
            data: { requesterId: me.id, addresseeId: target.id, status: 'pending' },
          })
          return { status: 200, body: { result: 'sent' } }
        }
        if (row.status === 'blocked') return { status: 404, body: { error: 'not_available' } }
        if (row.status === 'accepted') return { status: 200, body: { result: 'already_friends' } }

        // pending
        if (row.requesterId === target.id) {
          // هو كان باعتلي طلب -> نقبله علطول
          await tx.friendship.update({ where: { id: row.id }, data: { status: 'accepted' } })
          return { status: 200, body: { result: 'accepted' } }
        }
        return { status: 200, body: { result: 'already_sent' } }
      },
      { isolationLevel: 'Serializable' }
    )
    return json(result.body, result.status, req)
  } catch (e) {
    // تعارض لحظي (اتنين بعتوا مع بعض) أو unique
    if (e?.code === 'P2034' || e?.code === 'P2002') return json({ error: 'try_again' }, 409, req)
    console.error('friends/request', e)
    return json({ error: 'server_error' }, 500, req)
  }
}
