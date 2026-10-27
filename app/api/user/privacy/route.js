import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireMe, json, OPTIONS } from '@/lib/friends'

export { OPTIONS }

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

  try {
    const body = await req.json()
    const incoming = body.privacySettings || body

    const existing = await prisma.user.findUnique({
      where: { id: me.id },
      select: { privacySettings: true }
    })

    const current = (existing?.privacySettings && typeof existing.privacySettings === 'object')
      ? existing.privacySettings
      : {}

    const updated = {
      ...current,
      ...incoming
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
