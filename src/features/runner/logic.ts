// Runner game logic — pure functions, no React, no three.js
// All math is deterministic and Node-testable (run via `npm test`)

export const STEP_MS = 1000 / 60
export const LANE_COUNT = 3
export const LANE_WIDTH = 2
export const BASE_SPEED = 12
export const MAX_SPEED = 30
export const RAMP_DISTANCE = 1500
export const GRAVITY = 38
export const JUMP_VELOCITY = 11.5
export const LATERAL_SPEED = 12
export const PLAYER_WIDTH = 0.8
export const PLAYER_DEPTH = 0.8
export const PLAYER_HEIGHT = 1.6
export const SPAWN_Z = -80
export const DESPAWN_Z = 10
export const MIN_ROW_GAP_METERS = 12
export const ROW_GAP_EARLY_S = 1.1
export const ROW_GAP_LATE_S = 0.55
export const SPAWN_JITTER = 0.15
export const TALL_HEIGHT = 2.2
export const LOW_HEIGHT = 0.8
export const LOWBAR_WIDTH = 6.4
export const INITIAL_GRACE_METERS = 30
export const COLLISION_HALF_Z = (PLAYER_DEPTH + 1.2) / 2 // 1.0

export type Lane = 0 | 1 | 2
export type ObstacleKind = 'tall' | 'low'

export interface Obstacle {
  id: number
  lane: Lane
  kind: ObstacleKind
  z: number
  x: number
  width: number
  depth: number
  height: number
}

export interface RunnerState {
  status: 'running' | 'over'
  distance: number
  speed: number
  lane: Lane
  x: number
  y: number
  vy: number
  jumpQueued: boolean
  obstacles: Obstacle[]
  nextObstacleId: number
  metersToNextRow: number
  lastFreeLane: Lane | null
}

export type LaneShift = -1 | 1

export function createInitialState(): RunnerState {
  return {
    status: 'running',
    distance: 0,
    speed: BASE_SPEED,
    lane: 1,
    x: 0,
    y: 0,
    vy: 0,
    jumpQueued: false,
    obstacles: [],
    nextObstacleId: 1,
    metersToNextRow: INITIAL_GRACE_METERS,
    lastFreeLane: null,
  }
}

export function speedAt(distanceMeters: number): number {
  const t = Math.min(1, distanceMeters / RAMP_DISTANCE)
  return BASE_SPEED + (MAX_SPEED - BASE_SPEED) * t
}

export function shiftLane(state: RunnerState, dir: LaneShift): RunnerState {
  if (state.status === 'over') return state
  const newLane = Math.max(0, Math.min(LANE_COUNT - 1, state.lane + dir)) as Lane
  if (newLane === state.lane) return state
  return { ...state, lane: newLane }
}

export function queueJump(state: RunnerState): RunnerState {
  if (state.status === 'over') return state
  if (state.y <= 0 && state.vy === 0) {
    return { ...state, vy: JUMP_VELOCITY }
  }
  return { ...state, jumpQueued: true }
}

function randomLane(): Lane {
  return Math.floor(Math.random() * LANE_COUNT) as Lane
}

function pickFreeLane(used: Lane[]): Lane {
  for (let l = 0; l < LANE_COUNT; l++) {
    if (!used.includes(l as Lane)) return l as Lane
  }
  return 1
}

function spawnRow(state: RunnerState): RunnerState {
  const progress = Math.min(1, state.distance / RAMP_DISTANCE)
  const secondsPerRow = ROW_GAP_EARLY_S + (ROW_GAP_LATE_S - ROW_GAP_EARLY_S) * progress
  const rowGapM = Math.max(MIN_ROW_GAP_METERS, state.speed * secondsPerRow)
  const jitter = 1 + (Math.random() * 2 - 1) * SPAWN_JITTER

  const pattern = Math.random()
  const newObstacles: Obstacle[] = []

  if (pattern < 0.4) {
    // single tall
    const lane = randomLane()
    newObstacles.push({
      id: state.nextObstacleId++,
      lane,
      kind: 'tall',
      z: SPAWN_Z,
      x: (lane - 1) * LANE_WIDTH,
      width: 1.6,
      depth: 1.2,
      height: TALL_HEIGHT,
    })
    state = { ...state, lastFreeLane: pickFreeLane([lane]) }
  } else if (pattern < 0.65) {
    // double tall — one lane free, constrained to be within 1 of previous free lane
    let freeLane: Lane
    if (state.lastFreeLane !== null) {
      // Must pick a free lane within 1 of lastFreeLane
      const candidates = ([0, 1, 2] as Lane[]).filter(
        l => Math.abs(l - state.lastFreeLane!) <= 1
      )
      freeLane = candidates[Math.floor(Math.random() * candidates.length)]
    } else {
      freeLane = pickFreeLane([randomLane(), randomLane()])
    }
    const lanes = [0, 1, 2].filter(l => l !== freeLane) as Lane[]
    for (const lane of lanes) {
      newObstacles.push({
        id: state.nextObstacleId++,
        lane,
        kind: 'tall',
        z: SPAWN_Z,
        x: (lane - 1) * LANE_WIDTH,
        width: 1.6,
        depth: 1.2,
        height: TALL_HEIGHT,
      })
    }
    state = { ...state, lastFreeLane: freeLane }
  } else if (pattern < 0.85) {
    // low bar — spans all lanes
    newObstacles.push({
      id: state.nextObstacleId++,
      lane: 1,
      kind: 'low',
      z: SPAWN_Z,
      x: 0,
      width: LOWBAR_WIDTH,
      depth: 1.2,
      height: LOW_HEIGHT,
    })
    state = { ...state, lastFreeLane: null }
  } else {
    // mixed: one tall + one low in different lanes
    const tallLane = randomLane()
    const lowLane = pickFreeLane([tallLane])
    newObstacles.push(
      {
        id: state.nextObstacleId++,
        lane: tallLane,
        kind: 'tall',
        z: SPAWN_Z,
        x: (tallLane - 1) * LANE_WIDTH,
        width: 1.6,
        depth: 1.2,
        height: TALL_HEIGHT,
      },
      {
        id: state.nextObstacleId++,
        lane: lowLane,
        kind: 'low',
        z: SPAWN_Z,
        x: (lowLane - 1) * LANE_WIDTH,
        width: LOWBAR_WIDTH,
        depth: 1.2,
        height: LOW_HEIGHT,
      }
    )
    state = { ...state, lastFreeLane: pickFreeLane([tallLane, lowLane]) }
  }

  return {
    ...state,
    obstacles: [...state.obstacles, ...newObstacles],
    metersToNextRow: state.metersToNextRow + rowGapM * jitter,
  }
}

export function tick(state: RunnerState): RunnerState {
  if (state.status === 'over') return state

  const dt = STEP_MS / 1000

  // 1) Speed ramp + distance
  const newSpeed = speedAt(state.distance)
  const newDistance = state.distance + newSpeed * dt

  // 2) Lateral movement (lerp x toward target lane center)
  const targetX = (state.lane - 1) * LANE_WIDTH
  const lateralDelta = targetX - state.x
  const lateralStep = Math.sign(lateralDelta) * Math.min(Math.abs(lateralDelta), LATERAL_SPEED * dt)
  const newX = state.x + lateralStep

  // 3) Vertical physics
  let newY = state.y
  let newVy = state.vy
  let newJumpQueued = state.jumpQueued

  if (newY > 0 || newVy !== 0) {
    newY += newVy * dt
    newVy -= GRAVITY * dt
    if (newY <= 0) {
      newY = 0
      newVy = 0
      if (newJumpQueued) {
        newVy = JUMP_VELOCITY
        newJumpQueued = false
      }
    }
  } else if (newJumpQueued) {
    // Edge case: queued while grounded (shouldn't happen, but consume it)
    newVy = JUMP_VELOCITY
    newJumpQueued = false
  }

  // 4) World advance + despawn
  const movedObstacles = state.obstacles
    .map((o) => ({ ...o, z: o.z + newSpeed * dt }))
    .filter((o) => o.z <= DESPAWN_Z)

  // 5) Spawning
  const nextMetersToNextRow = state.metersToNextRow - newSpeed * dt
  let spawnState = { ...state, obstacles: movedObstacles, metersToNextRow: nextMetersToNextRow }
  if (nextMetersToNextRow <= 0) {
    spawnState = spawnRow(spawnState)
  }

  // 6) Collision detection
  const playerHalfDepth = PLAYER_DEPTH / 2
  const playerHalfWidth = PLAYER_WIDTH / 2

  for (const o of spawnState.obstacles) {
    if (Math.abs(o.z) >= COLLISION_HALF_Z + o.depth / 2) continue

    const horizontalOverlap =
      Math.abs(newX - o.x) < playerHalfWidth + o.width / 2

    if (!horizontalOverlap) continue

    // Vertical: player spans [y, y+height], obstacle [0, height]
    // Player hits if bottom < obstacle height
    if (newY < o.height) {
      return { ...spawnState, status: 'over' }
    }
  }

  return {
    ...spawnState,
    distance: newDistance,
    speed: newSpeed,
    x: newX,
    y: newY,
    vy: newVy,
    jumpQueued: newJumpQueued,
  }
}

export function formatDistance(meters: number): string {
  const n = Math.floor(meters)
  const s = String(n)
  const parts = []
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i))
  }
  return parts.join(',') + ' m'
}