import { prisma } from '@/lib/prisma'
import { json, requireMe, OPTIONS } from '@/lib/friends'

export { OPTIONS }

export async function POST(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  try {
    const body = await req.json().catch(() => ({}))
    const notifId = body?.id
    const notifType = body?.type
    const fromUsername = body?.fromUsername
    const dismissAll = Boolean(body?.all)

    const existing = Array.isArray(me.notifications) ? me.notifications : []
    let updatedNotifs = existing

    if (dismissAll) {
      updatedNotifs = []
    } else if (notifId || notifType || fromUsername) {
      updatedNotifs = existing.filter(n => {
        // Match specific ID
        if (notifId && n.id === notifId) return false
        // Dismiss study requests
        if (notifType === 'study' && n.type === 'study') {
          if (!fromUsername || (n.fromUsername && n.fromUsername.toLowerCase() === fromUsername.toLowerCase())) {
            return false
          }
        }
        // Match type and sender
        if (notifType && fromUsername && n.type === notifType && (n.fromUsername || '').toLowerCase() === fromUsername.toLowerCase()) {
          return false
        }
        return true
      })
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { notifications: updatedNotifs }
    })

    return json({ success: true, count: updatedNotifs.length }, 200, req)
  } catch (err) {
    return json({ error: 'internal_error' }, 500, req)
  }
}
