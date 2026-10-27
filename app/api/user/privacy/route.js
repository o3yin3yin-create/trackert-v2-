import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMe, json, OPTIONS } from '@/lib/friends'
import { rateLimit } from '@/lib/rateLimit'

export { OPTIONS }

const ALLOWED_PRIVACY_KEYS = [
  'ghostMode',
  'focusSessions',
  'focusFlights',
  'scheduledHabits',
  'lectures',
  'habits',
  'spotify',
]

export async function GET(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  const user = await prisma.user.findUnique({
    where: { id: me.id },
    select: { privacySettings: true }
  })

  return json({ privacySettings: user?.privacySettings || {} }, 200, req)
}

export async function POST(req) {
  const me = await requireMe(req)
  if (!me) return json({ error: 'unauthorized' }, 401, req)

  if (!rateLimit(`privacy:${me.id}`, 30, 60_000)) {
    return json({ error: 'too_many_requests' }, 429, req)
  }

  try {
    const body = await req.json()
    const rawIncoming = (body.privacySettings && typeof body.privacySettings === 'object') ? body.privacySettings : body

    // Sanitize and strictly whitelist allowed keys
    const sanitizedIncoming = {}
    if (rawIncoming && typeof rawIncoming === 'object') {
      for (const key of ALLOWED_PRIVACY_KEYS) {
        if (typeof rawIncoming[key] === 'boolean') {
          sanitizedIncoming[key] = rawIncoming[key]
        }
      }
    }

    const existing = await prisma.user.findUnique({
      where: { id: me.id },
      select: { privacySettings: true }
    })

    const current = (existing?.privacySettings && typeof existing.privacySettings === 'object')
      ? existing.privacySettings
      : {}

    const updated = {
      ...current,
      ...sanitizedIncoming
    }

    await prisma.user.update({
      where: { id: me.id },
      data: { privacySettings: updated }
    })

    return json({ success: true, privacySettings: updated }, 200, req)
  } catch (err) {
    console.error('Privacy update error:', err)
    return json({ error: 'internal_error' }, 500, req)
  }
}
