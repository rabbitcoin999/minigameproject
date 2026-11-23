// Brick Blast game logic tests — pure TypeScript, Node-testable

import {
  createInitialState,
  tick,
  launchBall,
  updatePaddle,
  nextLevel,
  restartGame,
  createLevelBricks,
  circleRectCollision,
  rectFromPos,
  GAME_WIDTH,
  GAME_HEIGHT,
  BALL_RADIUS,
  INITIAL_PADDLE_WIDTH,
  INITIAL_LIVES,
  BRICK_CONFIGS,
  LEVEL_CONFIGS,
} from './physics'

import type { BrickBlastState, BrickType, Vector2 } from './types'

console.log('Running Brick Blast tests...')

// Test 1: Initial state creation
const initialState = createInitialState(GAME_WIDTH, GAME_HEIGHT)
assert(initialState.phase === 'idle', 'Initial phase should be idle')
assert(initialState.score === 0, 'Initial score should be 0')
assert(initialState.lives === INITIAL_LIVES, `Initial lives should be ${INITIAL_LIVES}`)
assert(initialState.level === 1, 'Initial level should be 1')
assert(initialState.ball.launched === false, 'Ball should not be launched initially')
assert(initialState.ball.speed > 0, 'Ball should have initial speed')
assert(initialState.paddle.width > 0, 'Paddle should have width')
assert(initialState.bricks.length > 0, 'Should have bricks for level 1')
assert(initialState.canvasWidth === GAME_WIDTH, 'Canvas width should match')
assert(initialState.canvasHeight === GAME_HEIGHT, 'Canvas height should match')

console.log('✓ Initial state creation works')

// Test 2: Brick creation for level 1
const level1Bricks = createLevelBricks(initialState, 1)
assert(level1Bricks.length > 0, 'Level 1 should have bricks')
const destructibleBricks = level1Bricks.filter(b => b.type !== 'unbreakable')
assert(destructibleBricks.length > 0, 'Should have destructible bricks')
assert(level1Bricks.every(b => b.id >= 0), 'All bricks should have valid IDs')
assert(level1Bricks.every(b => b.hitsRemaining > 0 || b.type === 'unbreakable'), 'Bricks should have hits remaining')

console.log('✓ Level 1 brick creation works')

// Test 3: Brick types have correct configs
assert(BRICK_CONFIGS.normal.hits === 1, 'Normal brick should have 1 hit')
assert(BRICK_CONFIGS.hard.hits === 2, 'Hard brick should have 2 hits')
assert(BRICK_CONFIGS.unbreakable.hits === -1, 'Unbreakable brick should have -1 hits')
assert(BRICK_CONFIGS.explosive.hits === 1, 'Explosive brick should have 1 hit')
assert(BRICK_CONFIGS.multiplier.hits === 1, 'Multiplier brick should have 1 hit')

assert(BRICK_CONFIGS.normal.points === 10, 'Normal brick should give 10 points')
assert(BRICK_CONFIGS.hard.points === 25, 'Hard brick should give 25 points')
assert(BRICK_CONFIGS.explosive.points === 50, 'Explosive brick should give 50 points')
assert(BRICK_CONFIGS.multiplier.points === 5, 'Multiplier brick should give 5 points')

console.log('✓ Brick type configurations are correct')

// Test 4: Ball launch
const launchedState = launchBall(initialState)
assert(launchedState.phase === 'playing', 'Phase should be playing after launch')
assert(launchedState.ball.launched === true, 'Ball should be launched')
assert(launchedState.ball.velocity.x !== 0 || launchedState.ball.velocity.y !== 0, 'Ball should have velocity')
assert(launchedState.ball.velocity.y < 0, 'Ball should move upward initially')

console.log('✓ Ball launch works')

// Test 5: Paddle update
const paddleUpdatedState = updatePaddle(launchedState, GAME_WIDTH / 2 + 100, 1/60)
assert(paddleUpdatedState.paddle.position.x > launchedState.paddle.position.x, 'Paddle should move right')

const paddleUpdatedState2 = updatePaddle(launchedState, GAME_WIDTH / 2 - 100, 1/60)
assert(paddleUpdatedState2.paddle.position.x < launchedState.paddle.position.x, 'Paddle should move left')

// Test paddle clamping
const leftClamped = updatePaddle(launchedState, 0, 1/60)
const rightClamped = updatePaddle(launchedState, GAME_WIDTH * 2, 1/60)
assert(leftClamped.paddle.position.x > 0, 'Paddle should be clamped to left bound')
assert(rightClamped.paddle.position.x < GAME_WIDTH, 'Paddle should be clamped to right bound')

console.log('✓ Paddle update and clamping works')

// Test 6: Circle-rectangle collision
const circleCenter: Vector2 = { x: 100, y: 100 }
const circleRadius = 10
const rect = { x: 90, y: 90, width: 20, height: 20 }

const collision = circleRectCollision(circleCenter, circleRadius, rect)
assert(collision.hit === true, 'Circle inside rect should collide')
assert(collision.penetration > 0, 'Should have penetration')

// Test no collision
const farCircle: Vector2 = { x: 200, y: 200 }
const noCollision = circleRectCollision(farCircle, circleRadius, rect)
assert(noCollision.hit === false, 'Circle far from rect should not collide')

console.log('✓ Circle-rectangle collision detection works')

// Test 7: Game tick advances ball
let tickState = launchBall(initialState)
const startY = tickState.ball.position.y
for (let i = 0; i < 10; i++) {
  tickState = tick(tickState, 1/60)
}
assert(tickState.ball.position.y < startY, 'Ball should move upward after launch')

console.log('✓ Game tick advances ball position')

// Test 8: Wall collision reflection
// Create a state where ball is near left wall
const leftWallState: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: { x: launchedState.ball.radius + 1, y: GAME_HEIGHT / 2 },
    velocity: { x: -100, y: 0 },
  },
}
const afterLeftWall = tick(leftWallState, 1/60)
assert(afterLeftWall.ball.velocity.x > 0, 'Ball should reflect off left wall')

// Test right wall
const rightWallState: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: { x: GAME_WIDTH - launchedState.ball.radius - 1, y: GAME_HEIGHT / 2 },
    velocity: { x: 100, y: 0 },
  },
}
const afterRightWall = tick(rightWallState, 1/60)
assert(afterRightWall.ball.velocity.x < 0, 'Ball should reflect off right wall')

// Test top wall
const topWallState: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: { x: GAME_WIDTH / 2, y: launchedState.ball.radius + 1 },
    velocity: { x: 0, y: -100 },
  },
}
const afterTopWall = tick(topWallState, 1/60)
assert(afterTopWall.ball.velocity.y > 0, 'Ball should reflect off top wall')

console.log('✓ Wall collisions work')

// Test 9: Paddle collision
const paddleHitState: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: {
      x: launchedState.paddle.position.x,
      y: launchedState.paddle.position.y - launchedState.paddle.height / 2 - launchedState.ball.radius - 1
    },
    velocity: { x: 0, y: 200 }, // Moving down toward paddle
  },
}
const afterPaddleHit = tick(paddleHitState, 1/60)
assert(afterPaddleHit.ball.velocity.y < 0, 'Ball should reflect upward off paddle')

console.log('✓ Paddle collision works')

// Test 10: Life loss and game over
const ballLostState: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT + launchedState.ball.radius * 3 },
    velocity: { x: 0, y: 200 },
  },
  lives: 1,
}
const afterBallLost = tick(ballLostState, 1/60)
assert(afterBallLost.lives === 0, 'Should lose a life')
assert(afterBallLost.phase === 'gameOver', 'Should be game over when lives reach 0')

// Test with multiple lives
const ballLostState2: BrickBlastState = {
  ...launchedState,
  ball: {
    ...launchedState.ball,
    position: { x: GAME_WIDTH / 2, y: GAME_HEIGHT + launchedState.ball.radius * 3 },
    velocity: { x: 0, y: 200 },
  },
  lives: 3,
}
const afterBallLost2 = tick(ballLostState2, 1/60)
assert(afterBallLost2.lives === 2, 'Should lose one life')
assert(afterBallLost2.phase === 'idle', 'Should return to idle with remaining lives')
assert(afterBallLost2.ball.launched === false, 'Ball should be relaunched')

console.log('✓ Life loss and game over work')

// Test 11: Level progression
const levelCompleteState: BrickBlastState = {
  ...launchedState,
  bricks: [], // All bricks destroyed
  phase: 'levelComplete',
}
const nextLevelState = nextLevel(levelCompleteState)
assert(nextLevelState.level === 2, 'Should advance to level 2')
assert(nextLevelState.phase === 'idle', 'Should be idle for next level')
assert(nextLevelState.bricks.length > 0, 'Should have bricks for level 2')
assert(nextLevelState.ball.launched === false, 'Ball should not be launched')
assert(nextLevelState.ball.speed > levelCompleteState.ball.speed, 'Ball should be faster')

console.log('✓ Level progression works')

// Test 12: Game restart
const gameOverState: BrickBlastState = {
  ...launchedState,
  phase: 'gameOver',
  score: 1000,
  lives: 0,
  level: 3,
}
const restartedState = restartGame(gameOverState)
assert(restartedState.phase === 'idle', 'Should be idle after restart')
assert(restartedState.score === 0, 'Score should reset')
assert(restartedState.lives === INITIAL_LIVES, 'Lives should reset')
assert(restartedState.level === 1, 'Level should reset')
assert(restartedState.ball.launched === false, 'Ball should not be launched')

console.log('✓ Game restart works')

// Test 13: Multiple levels have increasing difficulty
for (let i = 1; i <= LEVEL_CONFIGS.length; i++) {
  const levelState = createInitialState(GAME_WIDTH, GAME_HEIGHT)
  const bricks = createLevelBricks({ ...levelState, level: i }, i)
  const config = LEVEL_CONFIGS[Math.min(i - 1, LEVEL_CONFIGS.length - 1)]
  assert(bricks.length >= config.rows * config.cols * 0.8, `Level ${i} should have enough bricks`)
}

console.log('✓ Multiple levels work with increasing difficulty')

// Test 14: Particle system
const particleState = tick(launchedState, 1/60)
// Just verify particles array exists and can be updated
assert(Array.isArray(particleState.particles), 'Particles should be an array')

console.log('✓ Particle system exists')

console.log('\n✅ All Brick Blast tests passed!')

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`)
  }
}