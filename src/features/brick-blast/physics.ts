// Brick Blast game physics — pure functions, no React, fully testable

import type {
  BrickBlastState,
  Ball,
  Paddle,
  Brick,
  Particle,
  Vector2,
  Rectangle,
  BrickType,
  GamePhase
} from './types'
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  INITIAL_BALL_SPEED,
  BALL_SPEED_INCREMENT_PER_LEVEL,
  MAX_BALL_SPEED,
  BALL_RADIUS,
  BALL_LAUNCH_ANGLE_VARIANCE,
  INITIAL_PADDLE_WIDTH,
  MIN_PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_Y_OFFSET,
  PADDLE_SPEED,
  PADDLE_EDGE_BOUNCE_FACTOR,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BRICK_PADDING,
  BRICK_TOP_OFFSET,
  BRICK_SIDE_PADDING,
  INITIAL_LIVES,
  PARTICLE_COUNT_ON_HIT,
  PARTICLE_COUNT_ON_DESTROY,
  PARTICLE_LIFE_MS,
  PARTICLE_SPEED,
  COMBO_TIMEOUT_MS,
  MAX_COMBO_MULTIPLIER,
  LEVEL_CONFIGS
} from './constants.ts'
import { BRICK_CONFIGS } from './types.ts'

// Helper: create a vector
export function vec2(x: number, y: number): Vector2 {
  return { x, y }
}

// Helper: rectangle from position and size
export function rectFromPos(pos: Vector2, width: number, height: number): Rectangle {
  return { x: pos.x - width / 2, y: pos.y - height / 2, width, height }
}

// Check if two rectangles overlap
export function rectsOverlap(a: Rectangle, b: Rectangle): boolean {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y
}

// Check circle-rectangle collision, returns collision normal
export function circleRectCollision(
  circleCenter: Vector2,
  circleRadius: number,
  rect: Rectangle
): { hit: boolean; normal: Vector2; penetration: number } {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x, Math.min(circleCenter.x, rect.x + rect.width))
  const closestY = Math.max(rect.y, Math.min(circleCenter.y, rect.y + rect.height))

  const dx = circleCenter.x - closestX
  const dy = circleCenter.y - closestY
  const distanceSquared = dx * dx + dy * dy

  if (distanceSquared >= circleRadius * circleRadius) {
    return { hit: false, normal: { x: 0, y: 0 }, penetration: 0 }
  }

  const distance = Math.sqrt(distanceSquared)
  if (distance === 0) {
    // Circle center is inside rectangle - push out based on closest edge
    const distToLeft = circleCenter.x - rect.x
    const distToRight = rect.x + rect.width - circleCenter.x
    const distToTop = circleCenter.y - rect.y
    const distToBottom = rect.y + rect.height - circleCenter.y

    const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom)

    if (minDist === distToLeft) return { hit: true, normal: { x: -1, y: 0 }, penetration: circleRadius - distToLeft }
    if (minDist === distToRight) return { hit: true, normal: { x: 1, y: 0 }, penetration: circleRadius - distToRight }
    if (minDist === distToTop) return { hit: true, normal: { x: 0, y: -1 }, penetration: circleRadius - distToTop }
    return { hit: true, normal: { x: 0, y: 1 }, penetration: circleRadius - distToBottom }
  }

  const normal = { x: dx / distance, y: dy / distance }
  const penetration = circleRadius - distance

  return { hit: true, normal, penetration }
}

// Create initial game state
export function createInitialState(canvasWidth: number, canvasHeight: number): BrickBlastState {
  const scaleX = canvasWidth / GAME_WIDTH
  const scaleY = canvasHeight / GAME_HEIGHT
  const scale = Math.min(scaleX, scaleY)

  const gameWidth = GAME_WIDTH * scale
  const gameHeight = GAME_HEIGHT * scale
  const offsetX = (canvasWidth - gameWidth) / 2
  const offsetY = (canvasHeight - gameHeight) / 2

  const paddleWidth = INITIAL_PADDLE_WIDTH * scale
  const paddleX = offsetX + gameWidth / 2
  const paddleY = offsetY + gameHeight - PADDLE_Y_OFFSET * scale

  const ballX = paddleX
  const ballY = paddleY - PADDLE_HEIGHT * scale / 2 - BALL_RADIUS * scale - 2

  return {
    phase: 'idle',
    score: 0,
    lives: INITIAL_LIVES,
    level: 1,
    ball: {
      position: { x: ballX, y: ballY },
      velocity: { x: 0, y: 0 },
      radius: BALL_RADIUS * scale,
      speed: INITIAL_BALL_SPEED * scale,
      launched: false,
    },
    paddle: {
      position: { x: paddleX, y: paddleY },
      width: paddleWidth,
      height: PADDLE_HEIGHT * scale,
      speed: PADDLE_SPEED * scale,
    },
    bricks: [],
    particles: [],
    canvasWidth,
    canvasHeight,
    gameWidth,
    gameHeight,
    paddleTargetX: paddleX,
    combo: 0,
    lastHitTime: 0,
  }
}

// Create bricks for a level
export function createLevelBricks(state: BrickBlastState, level: number): Brick[] {
  const config = LEVEL_CONFIGS[Math.min(level - 1, LEVEL_CONFIGS.length - 1)]
  const bricks: Brick[] = []
  let brickId = 0

  const scaleX = state.gameWidth / GAME_WIDTH
  const scaleY = state.gameHeight / GAME_HEIGHT
  const brickWidth = BRICK_WIDTH * scaleX
  const brickHeight = BRICK_HEIGHT * scaleY
  const padding = BRICK_PADDING * Math.min(scaleX, scaleY)
  const topOffset = BRICK_TOP_OFFSET * scaleY
  const sidePadding = BRICK_SIDE_PADDING * scaleX

  const startX = (state.canvasWidth - state.gameWidth) / 2 + sidePadding + brickWidth / 2
  const startY = (state.canvasHeight - state.gameHeight) / 2 + topOffset + brickHeight / 2

  for (let row = 0; row < config.rows; row++) {
    for (let col = 0; col < config.cols; col++) {
      // Skip some bricks to create patterns
      if (row === 0 && (col === 0 || col === config.cols - 1)) continue

      // Weighted random brick type
      const rand = Math.random()
      let cumulative = 0
      let selectedType: BrickType = 'normal'

      for (const type of config.brickTypes) {
        cumulative += BRICK_CONFIGS[type].probability
        if (rand <= cumulative) {
          selectedType = type
          break
        }
      }

      const brickConfig = BRICK_CONFIGS[selectedType]
      const x = startX + col * (brickWidth + padding)
      const y = startY + row * (brickHeight + padding)

      bricks.push({
        id: brickId++,
        position: { x, y },
        width: brickWidth,
        height: brickHeight,
        type: selectedType,
        hitsRemaining: brickConfig.hits,
        maxHits: brickConfig.hits,
        points: brickConfig.points,
        color: brickConfig.color,
      })
    }
  }

  return bricks
}

// Launch the ball
export function launchBall(state: BrickBlastState, angle?: number): BrickBlastState {
  if (state.ball.launched) return state

  // Default angle: slightly randomized upward
  const baseAngle = -Math.PI / 2 // straight up
  const variance = (Math.random() - 0.5) * 2 * BALL_LAUNCH_ANGLE_VARIANCE
  const finalAngle = angle ?? (baseAngle + variance)

  return {
    ...state,
    phase: 'playing',
    ball: {
      ...state.ball,
      velocity: {
        x: Math.cos(finalAngle) * state.ball.speed,
        y: Math.sin(finalAngle) * state.ball.speed,
      },
      launched: true,
    },
  }
}

// Update paddle position
export function updatePaddle(state: BrickBlastState, targetX: number, dt: number): BrickBlastState {
  const halfWidth = state.paddle.width / 2
  const leftBound = (state.canvasWidth - state.gameWidth) / 2 + halfWidth
  const rightBound = (state.canvasWidth + state.gameWidth) / 2 - halfWidth

  const clampedX = Math.max(leftBound, Math.min(rightBound, targetX))

  // Smooth paddle movement
  const currentX = state.paddle.position.x
  const maxMove = state.paddle.speed * dt
  const diff = clampedX - currentX
  const newX = currentX + Math.sign(diff) * Math.min(Math.abs(diff), maxMove)

  // If ball not launched, keep it centered on paddle
  let newBall = state.ball
  if (!state.ball.launched) {
    newBall = {
      ...state.ball,
      position: { ...state.ball.position, x: newX },
    }
  }

  return {
    ...state,
    paddle: { ...state.paddle, position: { ...state.paddle.position, x: newX } },
    ball: newBall,
    paddleTargetX: clampedX,
  }
}

// Create particles at position
function createParticles(
  position: Vector2,
  color: string,
  count: number,
  speed: number = PARTICLE_SPEED
): Particle[] {
  const particles: Particle[] = []
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const particleSpeed = speed * (0.5 + Math.random() * 0.5)
    particles.push({
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * particleSpeed,
        y: Math.sin(angle) * particleSpeed,
      },
      color,
      life: PARTICLE_LIFE_MS,
      maxLife: PARTICLE_LIFE_MS,
      size: 3 + Math.random() * 4,
    })
  }
  return particles
}

// Check and handle brick collisions
function checkBrickCollisions(state: BrickBlastState): BrickBlastState {
  let newState = { ...state }
  const ballRect = rectFromPos(state.ball.position, state.ball.radius * 2, state.ball.radius * 2)
  let hitBrick: Brick | null = null
  let hitNormal: Vector2 = { x: 0, y: 0 }

  // Find first brick collision
  for (const brick of state.bricks) {
    if (brick.type === 'unbreakable' && brick.hitsRemaining < 0) continue

    const brickRect = rectFromPos(brick.position, brick.width, brick.height)
    const collision = circleRectCollision(state.ball.position, state.ball.radius, brickRect)

    if (collision.hit) {
      hitBrick = brick
      hitNormal = collision.normal
      break
    }
  }

  if (!hitBrick) return state

  const now = Date.now()
  const brickConfig = BRICK_CONFIGS[hitBrick.type]

  // Handle different brick types
  let newBricks = [...newState.bricks]
  let scoreGained = 0
  let comboMultiplier = 1

  // Update combo
  if (now - newState.lastHitTime < COMBO_TIMEOUT_MS) {
    newState.combo = Math.min(newState.combo + 1, MAX_COMBO_MULTIPLIER)
  } else {
    newState.combo = 1
  }
  newState.lastHitTime = now
  comboMultiplier = newState.combo

  switch (hitBrick.type) {
    case 'normal':
    case 'hard':
    case 'multiplier': {
      const brickIndex = newBricks.findIndex(b => b.id === hitBrick!.id)
      if (brickIndex >= 0) {
        const brick = newBricks[brickIndex]
        brick.hitsRemaining--

        if (brick.hitsRemaining <= 0) {
          // Brick destroyed
          scoreGained = brick.points * comboMultiplier
          if (brick.type === 'multiplier') {
            scoreGained *= 2 // Multiplier bricks give double points
          }
          newBricks.splice(brickIndex, 1)
          // Add destroy particles
          newState.particles.push(...createParticles(brick.position, brick.color, PARTICLE_COUNT_ON_DESTROY))
        } else {
          // Brick hit but not destroyed
          scoreGained = 5 * comboMultiplier
          // Add hit particles
          newState.particles.push(...createParticles(hitBrick.position, brick.color, PARTICLE_COUNT_ON_HIT))
        }
      }
      break
    }

    case 'explosive': {
      // Explosive brick destroys itself and adjacent bricks
      const brickIndex = newBricks.findIndex(b => b.id === hitBrick!.id)
      if (brickIndex >= 0) {
        const brick = newBricks[brickIndex]
        scoreGained = brick.points * comboMultiplier

        // Find adjacent bricks (within 1.5 brick widths)
        const explosionRadius = brick.width * 1.5
        const toDestroy: number[] = []

        for (let i = 0; i < newBricks.length; i++) {
          const other = newBricks[i]
          if (other.type === 'unbreakable') continue // Unbreakable survives

          const dx = other.position.x - brick.position.x
          const dy = other.position.y - brick.position.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist <= explosionRadius) {
            toDestroy.push(i)
          }
        }

        // Destroy adjacent bricks (in reverse order to maintain indices)
        for (let i = toDestroy.length - 1; i >= 0; i--) {
          const destroyedBrick = newBricks[toDestroy[i]]
          if (destroyedBrick.id !== brick.id) {
            scoreGained += destroyedBrick.points * comboMultiplier
          }
          newState.particles.push(...createParticles(destroyedBrick.position, destroyedBrick.color, PARTICLE_COUNT_ON_DESTROY))
        }

        // Remove destroyed bricks
        newBricks = newBricks.filter((_, idx) => !toDestroy.includes(idx))

        // Add explosion particles at center
        newState.particles.push(...createParticles(brick.position, '#ef4444', PARTICLE_COUNT_ON_DESTROY * 2, PARTICLE_SPEED * 1.5))
      }
      break
    }

    case 'unbreakable':
      // Just bounce, no score, no destruction
      newState.particles.push(...createParticles(hitBrick.position, '#64748b', PARTICLE_COUNT_ON_HIT))
      break
  }

  // Reflect ball velocity
  let newVelocity = { ...state.ball.velocity }
  if (Math.abs(hitNormal.x) > Math.abs(hitNormal.y)) {
    newVelocity.x = -newVelocity.x
  } else {
    newVelocity.y = -newVelocity.y
  }

  // Slightly increase ball speed on hit (up to max)
  const currentSpeed = Math.sqrt(newVelocity.x ** 2 + newVelocity.y ** 2)
  if (currentSpeed < MAX_BALL_SPEED * (state.gameWidth / GAME_WIDTH)) {
    const speedIncrease = 1.02
    newVelocity.x *= speedIncrease
    newVelocity.y *= speedIncrease
  }

  newState = {
    ...newState,
    bricks: newBricks,
    ball: { ...state.ball, velocity: newVelocity },
    score: newState.score + scoreGained,
  }

  // Check for level complete
  const remainingDestructible = newBricks.filter(b => b.type !== 'unbreakable').length
  if (remainingDestructible === 0) {
    newState.phase = 'levelComplete'
  }

  return newState
}

// Update particles
function updateParticles(particles: Particle[], dt: number): Particle[] {
  const dtMs = dt * 1000
  return particles
    .map(p => ({
      ...p,
      position: {
        x: p.position.x + p.velocity.x * dt,
        y: p.position.y + p.velocity.y * dt,
      },
      velocity: {
        x: p.velocity.x * 0.98, // drag
        y: p.velocity.y * 0.98,
      },
      life: p.life - dtMs,
    }))
    .filter(p => p.life > 0)
}

// Main game tick function
export function tick(state: BrickBlastState, dt: number): BrickBlastState {
  if (state.phase !== 'playing') {
    // Still update particles when paused/game over
    return {
      ...state,
      particles: updateParticles(state.particles, dt),
    }
  }

  let newState = { ...state }

  // Update ball position
  const newBallPos = {
    x: state.ball.position.x + state.ball.velocity.x * dt,
    y: state.ball.position.y + state.ball.velocity.y * dt,
  }

  newState.ball = { ...state.ball, position: newBallPos }

  // Wall collisions (left/right)
  const leftWall = (state.canvasWidth - state.gameWidth) / 2 + state.ball.radius
  const rightWall = (state.canvasWidth + state.gameWidth) / 2 - state.ball.radius
  const topWall = (state.canvasHeight - state.gameHeight) / 2 + state.ball.radius

  if (newBallPos.x <= leftWall) {
    newState.ball.position.x = leftWall
    newState.ball.velocity.x = Math.abs(newState.ball.velocity.x)
  } else if (newBallPos.x >= rightWall) {
    newState.ball.position.x = rightWall
    newState.ball.velocity.x = -Math.abs(newState.ball.velocity.x)
  }

  // Top wall
  if (newBallPos.y <= topWall) {
    newState.ball.position.y = topWall
    newState.ball.velocity.y = Math.abs(newState.ball.velocity.y)
  }

  // Paddle collision
  const paddleRect = rectFromPos(state.paddle.position, state.paddle.width, state.paddle.height)
  const paddleCollision = circleRectCollision(newBallPos, state.ball.radius, paddleRect)

  if (paddleCollision.hit && newState.ball.velocity.y > 0) {
    // Hit paddle - reflect with angle based on where it hit
    const hitPos = (newBallPos.x - state.paddle.position.x) / (state.paddle.width / 2)
    const maxAngle = Math.PI / 3 // 60 degrees max
    const angle = hitPos * maxAngle

    const speed = Math.sqrt(newState.ball.velocity.x ** 2 + newState.ball.velocity.y ** 2)
    newState.ball.velocity.x = Math.sin(angle) * speed
    newState.ball.velocity.y = -Math.cos(angle) * speed
    newState.ball.position.y = paddleRect.y - state.ball.radius

    // Add paddle hit particles
    newState.particles.push(...createParticles(
      { x: newBallPos.x, y: paddleRect.y },
      '#06b6d4',
      PARTICLE_COUNT_ON_HIT,
      PARTICLE_SPEED * 0.5
    ))
  }

  // Brick collisions
  newState = checkBrickCollisions(newState)

  // Check for ball lost (below paddle)
  const bottomBound = state.canvasHeight + state.ball.radius * 2
  if (newState.ball.position.y > bottomBound) {
    newState.lives--

    if (newState.lives <= 0) {
      newState.phase = 'gameOver'
    } else {
      // Reset ball to paddle
      const paddleX = newState.paddle.position.x
      const paddleY = newState.paddle.position.y
      newState.ball = {
        ...newState.ball,
        position: {
          x: paddleX,
          y: paddleY - newState.paddle.height / 2 - newState.ball.radius - 2,
        },
        velocity: { x: 0, y: 0 },
        launched: false,
      }
      newState.phase = 'idle'
    }
  }

  // Update particles
  newState.particles = updateParticles(newState.particles, dt)

  return newState
}

// Start next level
export function nextLevel(state: BrickBlastState): BrickBlastState {
  const nextLevelNum = state.level + 1
  const config = LEVEL_CONFIGS[Math.min(nextLevelNum - 1, LEVEL_CONFIGS.length - 1)]

  // Increase ball speed for next level
  const scaleX = state.gameWidth / GAME_WIDTH
  const newBallSpeed = Math.min(
    INITIAL_BALL_SPEED * config.ballSpeedMultiplier * scaleX,
    MAX_BALL_SPEED * scaleX
  )

  // Adjust paddle width
  const newPaddleWidth = Math.max(
    INITIAL_PADDLE_WIDTH * config.paddleWidthMultiplier * scaleX,
    MIN_PADDLE_WIDTH * scaleX
  )

  const paddleX = state.paddle.position.x
  const paddleY = state.paddle.position.y

  return {
    ...state,
    phase: 'idle',
    level: nextLevelNum,
    ball: {
      ...state.ball,
      position: {
        x: paddleX,
        y: paddleY - state.paddle.height / 2 - state.ball.radius - 2,
      },
      velocity: { x: 0, y: 0 },
      speed: newBallSpeed,
      launched: false,
    },
    paddle: {
      ...state.paddle,
      width: newPaddleWidth,
    },
    bricks: createLevelBricks({ ...state, level: nextLevelNum }, nextLevelNum),
    combo: 0,
    lastHitTime: 0,
  }
}

// Restart game
export function restartGame(state: BrickBlastState): BrickBlastState {
  const newState = createInitialState(state.canvasWidth, state.canvasHeight)
  newState.bricks = createLevelBricks(newState, 1)
  return newState
}

// Check if ball is launched
export function isBallLaunched(state: BrickBlastState): boolean {
  return state.ball.launched
}

// Get game bounds for rendering
export function getGameBounds(state: BrickBlastState): Rectangle {
  return {
    x: (state.canvasWidth - state.gameWidth) / 2,
    y: (state.canvasHeight - state.gameHeight) / 2,
    width: state.gameWidth,
    height: state.gameHeight,
  }
}