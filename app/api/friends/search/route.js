import { prisma } from '@/lib/prisma'
import { PUBLIC_SELECT, pub, json, normUsername, requireMe, findBetween, rateLimit, OPTIONS } from '@/lib/friends'

export { OPTIONS }

// GET /api/friends/search?username=ahmed  -> مطابقة تامة بس
export async function GET(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)
  if (!rateLimit(`search:${me.id}`, 40)) return json({ error: 'too_many_requests' }, 429, req)

  const uname = normUsername(new URL(req.url).searchParams.get('username'))
  if (uname.length < 4 || uname.length > 64) return json({ user: null }, 200, req)

  const target = await prisma.user.findUnique({
    where: { username: uname },
    select: { id: true, isBlocked: true, ...PUBLIC_SELECT },
  })
  if (!target || target.id === me.id || target.isBlocked) return json({ user: null }, 200, req)

  const row = await findBetween(prisma, me.id, target.id)
  if (row?.status === 'blocked') return json({ user: null }, 200, req) // مبنكشفش مين عمل Block

  let relation = 'none'
  if (row?.status === 'accepted') relation = 'friends'
  else if (row?.status === 'pending')
    relation = row.requesterId === me.id ? 'pending_sent' : 'pending_received'

  return json({ user: pub(target), relation, friendshipId: row?.id ?? null }, 200, req)
}
