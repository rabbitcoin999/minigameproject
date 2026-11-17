import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import type { Player } from '@/types/player'

const SESSION_COOKIE_NAME = 'mgp_session'
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7 // 7 days

export interface SessionPayload {
  playerId: string // UUID
  playerHandle: string // unique handle, e.g. "player_one"
  exp: number
}

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error(
      'SESSION_SECRET is not configured. Add it to your .env file. See .env.example for details.'
    )
  }
  return new TextEncoder().encode(secret)
}

export async function createSessionToken(payload: Omit<SessionPayload, 'exp'>): Promise<string> {
  return new SignJWT({ playerId: payload.playerId, playerHandle: payload.playerHandle })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey())
    if (
      typeof payload.playerId !== 'string' ||
      typeof payload.playerHandle !== 'string' ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }
    return {
      playerId: payload.playerId,
      playerHandle: payload.playerHandle,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_SECONDS,
    path: '/',
  })
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = cookies()
  cookieStore.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

export const SESSION_COOKIE = SESSION_COOKIE_NAME
