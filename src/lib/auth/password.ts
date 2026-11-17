import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 10

/**
 * Hash a plaintext password using bcrypt.
 * Never store or log the plaintext password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a plaintext password against a stored hash.
 * Uses constant-time comparison internally.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
