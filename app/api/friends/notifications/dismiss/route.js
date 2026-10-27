import { prisma } from '@/lib/prisma'
import { json, requireMe, OPTIONS } from '@/lib/friends'

export { OPTIONS }

export async function POST(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  try {
    const body = await req.json().catch(() => ({}))
    const notifId = body?.id

    let updatedNotifs = []
    if (notifId) {
      const existing = Array.isArray(me.notifications) ? me.notifications : []
      updatedNotifs = existing.filter(n => n.id !== notifId)
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { notifications: updatedNotifs }
    })

    return json({ success: true }, 200, req)
  } catch (err) {
    return json({ error: 'internal_error' }, 500, req)
  }
}
