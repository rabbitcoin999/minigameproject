import { z } from 'zod'

// Player ID: 3-20 chars, letters, numbers, underscores
export const playerIdSchema = z
  .string()
  .min(3, 'Player ID must be at least 3 characters')
  .max(20, 'Player ID must be at most 20 characters')
  .regex(/^[a-zA-Z0-9_]+$/, 'Player ID can only contain letters, numbers, and underscores')

// Password: at least 8 characters, max 128 for safety
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')

export const registerSchema = z
  .object({
    playerId: playerIdSchema,
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export const loginSchema = z.object({
  playerId: playerIdSchema,
  password: passwordSchema,
})

// Score submission
export const scoreSubmissionSchema = z.object({
  gameKey: z.enum(['snake', '2048', 'memory', 'reaction', 'whack-a-mole', 'runner', 'brick-blast']),
  score: z.number().int().min(0).max(10_000_000),
  completionTime: z.number().int().min(0).max(86_400_000).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  durationMs: z.number().int().min(0).max(86_400_000).optional(),
  sessionToken: z.string().min(16).max(128).optional(),
})

export type ScoreSubmission = z.infer<typeof scoreSubmissionSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
