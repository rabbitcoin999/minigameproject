// One-off seed: insert the runner game row into Supabase.
// Usage: node scripts/seed-runner.mjs
// Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (same as the app).

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env')

function loadEnv() {
  try {
    const text = readFileSync(envPath, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  } catch {
    // .env missing — fall back to process env
  }
}

loadEnv()

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env')
  process.exit(1)
}

const supabase = createClient(url, key)

const { data, error } = await supabase
  .from('games')
  .upsert(
    {
      game_key: 'runner',
      name: 'Neon Runner',
      description:
        'Dash down an endless neon track — dodge obstacles and jump barriers at full speed.',
      is_active: true,
      lower_is_better: false,
      has_difficulty: false,
    },
    { onConflict: 'game_key' }
  )
  .select()

if (error) {
  console.error('Insert failed:', error.message)
  process.exit(1)
}

console.log('Runner game row ready:', data)
