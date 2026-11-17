import { NextResponse } from 'next/server'
import type { ZodError } from 'zod'

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status })
}

export function apiError(
  message: string,
  status: number,
  code?: string
): NextResponse {
  return NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status })
}

export function zodErrorResponse(error: ZodError): NextResponse {
  const first = error.errors[0]
  const message = first
    ? `${first.path.join('.') || 'input'}: ${first.message}`
    : 'Invalid input'
  return apiError(message, 400, 'VALIDATION_ERROR')
}

export function unauthorizedResponse(message = 'Authentication required'): NextResponse {
  return apiError(message, 401, 'UNAUTHORIZED')
}

export function notFoundResponse(message = 'Not found'): NextResponse {
  return apiError(message, 404, 'NOT_FOUND')
}

export function rateLimitResponse(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000))
  const res = apiError('Too many requests. Please try again later.', 429, 'RATE_LIMITED')
  res.headers.set('Retry-After', String(retryAfter))
  return res
}

export function serverErrorResponse(message = 'Internal server error'): NextResponse {
  return apiError(message, 500, 'INTERNAL_ERROR')
}
