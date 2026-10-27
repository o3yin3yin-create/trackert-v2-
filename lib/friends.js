import { NextResponse } from 'next/server'
import { getCurrentDbUser } from '@/lib/currentUser'
import { getCorsHeaders, handleCorsOptions } from '@/lib/cors'

// החقول الوحيدة اللي بتتبعت لمستخدم تاني (مفيش id ولا email ولا clerkId)
export const PUBLIC_SELECT = { username: true, name: true, avatar: true }
export const pub = (u) => (u ? { username: u.username, name: u.name, avatar: u.avatar } : null)

export const json = (data, status = 200, req = null) =>
  NextResponse.json(data, {
    status,
    headers: req ? getCorsHeaders(req) : undefined,
  })

export { handleCorsOptions as OPTIONS }

export const normUsername = (v) =>
  String(v ?? '').trim().toLowerCase().replace(/^@/, '')

// المستخدم الحالي أو null (بيرفض المحظورين من الأدمن)
export async function requireMe(req) {
  const me = await getCurrentDbUser(req)
  if (!me || me.isBlocked) return null
  return me
}

// صف الصداقة بين اتنين في أي اتجاه
export const findBetween = (db, a, b) =>
  db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  })

// Rate limit بسيط في الذاكرة (best-effort على Vercel لأن كل instance له ذاكرته)
const hits = new Map()
export function rateLimit(key, max = 20, windowMs = 60_000) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (arr.length >= max) { hits.set(key, arr); return false }
  arr.push(now); hits.set(key, arr); return true
}
