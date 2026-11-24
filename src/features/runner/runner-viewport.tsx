'use client'

import { useEffect, useRef, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { tick, createInitialState, shiftLane, queueJump, type RunnerState } from './logic'

// --- Three.js constants ---
const FOG_COLOR = 0x020617 // dark-950
const FOG_NEAR = 30
const FOG_FAR = 110
const PIXEL_RATIO_MAX = 2
const CAMERA_Y = 3.2
const CAMERA_Z = 6.5
const CAMERA_X_FACTOR = 0.45
const LOOK_AT_X_FACTOR = 0.2
const LOOK_AT_Y = 1.2
const LOOK_AT_Z = -8
const SEGMENT_COUNT = 10
const SEGMENT_LENGTH = 12
const TRACK_WIDTH = 8
const TRACK_HEIGHT = 0.2
const LANE_DIVIDER_WIDTH = 0.06
const LANE_DIVIDER_HEIGHT = 0.05
const EDGE_RAIL_WIDTH = 0.08
const EDGE_RAIL_HEIGHT = 0.2
const PILLAR_RADIUS = 0.15
const PILLAR_HEIGHT = 3
const PLAYER_WIDTH = 0.8
const PLAYER_HEIGHT = 1.6
const PLAYER_DEPTH = 0.8
const PLAYER_BODY_COLOR = 0x22c55e // primary-500
const PLAYER_VISOR_COLOR = 0x052e16 // primary-950
const BLOB_SHADOW_RADIUS = 0.55
const BLOB_SHADOW_MAX_OPACITY = 0.35
const BLOB_SHADOW_Y = 0.02
const TALL_OBSTACLE_COLOR = 0xef4444 // red-500
const LOW_OBSTACLE_COLOR = 0xf59e0b // amber-500
const TRACK_DARK = 0x0f172a // dark-900
const TRACK_DARKER = 0x111a2e // slightly darker
const LANE_DIVIDER_COLOR = 0x1e293b // dark-700
const EDGE_RAIL_COLOR = 0x334155 // dark-600
const PILLAR_COLOR = 0x164e63 // cyan-900
const HEMISPHERE_SKY = 0x64748b // dark-400
const HEMISPHERE_GROUND = 0x0f172a // dark-900
const HEMISPHERE_INTENSITY = 1.0
const DIRECTIONAL_COLOR = 0xe2e8f0 // dark-200
const DIRECTIONAL_INTENSITY = 1.2
const DIRECTIONAL_POSITION = new THREE.Vector3(5, 10, 4)

export interface RunnerViewportHandle {
  start(): void
  pause(): void
  resume(): void
  input(action: 'left' | 'right' | 'jump'): void
}

interface RunnerViewportProps {
  onScoreChange(score: number): void
  onSpeedChange?(speed: number): void
  onGameOver(score: number): void
  onAutoPause(): void
  // Ref passed as a normal prop: next/dynamic's loadable wrapper does not
  // forward React refs, so a plain prop is the reliable channel for the
  // imperative handle across the dynamic() boundary.
  handleRef?: MutableRefObject<RunnerViewportHandle | null>
}

const RunnerViewport = ({ onScoreChange, onSpeedChange, onGameOver, onAutoPause, handleRef }: RunnerViewportProps) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
    const sceneRef = useRef<THREE.Scene | null>(null)
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
    const rafRef = useRef<number | null>(null)
    const runningRef = useRef(false)
    const stateRef = useRef<RunnerState | null>(null)
    const lastTimeRef = useRef(0)
    const accRef = useRef(0)
    const lastScoreEmitRef = useRef(0)
    const dtRef = useRef(0)

    // Tracked disposables for cleanup
    const geometriesRef = useRef<THREE.BufferGeometry[]>([])
    const materialsRef = useRef<THREE.Material[]>([])
    const trackGroupsRef = useRef<THREE.Group[]>([])
    const obstacleMeshPoolRef = useRef<THREE.Mesh[]>([])

    // Materials refs (created in initScene, used in syncScene)
    const trackMaterialDarkRef = useRef<THREE.MeshLambertMaterial | null>(null)
    const trackMaterialDarkerRef = useRef<THREE.MeshLambertMaterial | null>(null)
    const tallMatRef = useRef<THREE.MeshLambertMaterial | null>(null)
    const lowMatRef = useRef<THREE.MeshLambertMaterial | null>(null)

    function trackGeometry(g: THREE.BufferGeometry) {
      geometriesRef.current.push(g)
      return g
    }
    function trackMaterial<T extends THREE.Material>(m: T): T {
      materialsRef.current.push(m)
      return m
    }

    function disposeTracked() {
      geometriesRef.current.forEach((g) => g.dispose())
      materialsRef.current.forEach((m) => m.dispose())
      geometriesRef.current = []
      materialsRef.current = []
    }

    // --- Scene setup ---
    function initScene() {
      if (!containerRef.current) return
      if (rendererRef.current) return // already initialized (strict-mode double-mount)
      const container = containerRef.current
      const w = container.clientWidth
      const h = container.clientHeight

      // Renderer — updateStyle true keeps canvas CSS size synced with its
      // drawing buffer (devicePixelRatio would otherwise scale it and
      // overflow the container on high-DPI/scaled displays).
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
      renderer.setSize(w, h, true)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO_MAX))
      renderer.setClearColor(FOG_COLOR, 1)
      renderer.shadowMap.enabled = false
      renderer.domElement.style.width = '100%'
      renderer.domElement.style.height = '100%'
      renderer.domElement.style.display = 'block'
      container.appendChild(renderer.domElement)
      rendererRef.current = renderer

      // Scene
      const scene = new THREE.Scene()
      scene.fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR)
      sceneRef.current = scene

      // Camera
      const camera = new THREE.PerspectiveCamera(65, w / h, 0.1, 200)
      camera.position.set(0, CAMERA_Y, CAMERA_Z)
      scene.add(camera)
      cameraRef.current = camera

      // Lights
      const hemi = new THREE.HemisphereLight(HEMISPHERE_SKY, HEMISPHERE_GROUND, HEMISPHERE_INTENSITY)
      scene.add(hemi)
      const dir = new THREE.DirectionalLight(DIRECTIONAL_COLOR, DIRECTIONAL_INTENSITY)
      dir.position.copy(DIRECTIONAL_POSITION)
      scene.add(dir)

      // --- Materials ---
      const trackMaterialDark = trackMaterial(new THREE.MeshLambertMaterial({ color: TRACK_DARK }))
      const trackMaterialDarker = trackMaterial(new THREE.MeshLambertMaterial({ color: TRACK_DARKER }))
      const dividerMaterial = trackMaterial(new THREE.MeshLambertMaterial({ color: LANE_DIVIDER_COLOR }))
      const railMaterial = trackMaterial(new THREE.MeshLambertMaterial({ color: EDGE_RAIL_COLOR }))
      const pillarMaterial = trackMaterial(new THREE.MeshLambertMaterial({ color: PILLAR_COLOR }))
      const tallMat = trackMaterial(new THREE.MeshLambertMaterial({ color: TALL_OBSTACLE_COLOR, emissive: TALL_OBSTACLE_COLOR, emissiveIntensity: 0.15 }))
      const lowMat = trackMaterial(new THREE.MeshLambertMaterial({ color: LOW_OBSTACLE_COLOR, emissive: LOW_OBSTACLE_COLOR, emissiveIntensity: 0.15 }))

      trackMaterialDarkRef.current = trackMaterialDark
      trackMaterialDarkerRef.current = trackMaterialDarker
      tallMatRef.current = tallMat
      lowMatRef.current = lowMat

      // --- Geometries ---
      const slabGeom = trackGeometry(new THREE.BoxGeometry(TRACK_WIDTH, TRACK_HEIGHT, SEGMENT_LENGTH))
      const dividerGeom = trackGeometry(new THREE.BoxGeometry(LANE_DIVIDER_WIDTH, LANE_DIVIDER_HEIGHT, SEGMENT_LENGTH))
      const railGeom = trackGeometry(new THREE.BoxGeometry(EDGE_RAIL_WIDTH, EDGE_RAIL_HEIGHT, SEGMENT_LENGTH))
      const pillarGeom = trackGeometry(new THREE.CylinderGeometry(PILLAR_RADIUS, PILLAR_RADIUS, PILLAR_HEIGHT, 8))

      // --- Track segments (recycled) ---
      for (let i = 0; i < SEGMENT_COUNT; i++) {
        const group = new THREE.Group()
        // Ground slab (alternating)
        const slab = new THREE.Mesh(slabGeom, i % 2 === 0 ? trackMaterialDark : trackMaterialDarker)
        slab.position.set(0, -TRACK_HEIGHT / 2, -i * SEGMENT_LENGTH - SEGMENT_LENGTH / 2)
        group.add(slab)
        // Lane dividers (two at x = ±1)
        for (const dx of [-1, 1]) {
          const div = new THREE.Mesh(dividerGeom, dividerMaterial)
          div.position.set(dx, -TRACK_HEIGHT / 2 + LANE_DIVIDER_HEIGHT / 2, -i * SEGMENT_LENGTH - SEGMENT_LENGTH / 2)
          group.add(div)
        }
        // Edge rails (at x = ±4)
        for (const dx of [-4, 4]) {
          const rail = new THREE.Mesh(railGeom, railMaterial)
          rail.position.set(dx, -TRACK_HEIGHT / 2 + EDGE_RAIL_HEIGHT / 2, -i * SEGMENT_LENGTH - SEGMENT_LENGTH / 2)
          group.add(rail)
        }
        // Neon pillars (one pair per segment at edges)
        for (const dx of [-4, 4]) {
          const pillar = new THREE.Mesh(pillarGeom, pillarMaterial)
          pillar.position.set(dx, PILLAR_HEIGHT / 2 - TRACK_HEIGHT / 2, -i * SEGMENT_LENGTH - SEGMENT_LENGTH / 2)
          group.add(pillar)
        }
        scene.add(group)
        trackGroupsRef.current.push(group)
      }

      // --- Player ---
      const playerGroup = new THREE.Group()
      const bodyGeom = trackGeometry(new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH))
      const bodyMat = trackMaterial(new THREE.MeshLambertMaterial({ color: PLAYER_BODY_COLOR, emissive: PLAYER_BODY_COLOR, emissiveIntensity: 0.2 }))
      const body = new THREE.Mesh(bodyGeom, bodyMat)
      body.position.y = PLAYER_HEIGHT / 2
      playerGroup.add(body)
      // Visor/head accent
      const visorGeom = trackGeometry(new THREE.BoxGeometry(PLAYER_WIDTH * 0.6, PLAYER_HEIGHT * 0.3, PLAYER_DEPTH * 0.05))
      const visorMat = trackMaterial(new THREE.MeshLambertMaterial({ color: PLAYER_VISOR_COLOR }))
      const visor = new THREE.Mesh(visorGeom, visorMat)
      visor.position.set(0, PLAYER_HEIGHT * 0.6, PLAYER_DEPTH / 2 + 0.03)
      playerGroup.add(visor)
      // Blob shadow
      const shadowGeom = trackGeometry(new THREE.CircleGeometry(BLOB_SHADOW_RADIUS, 16))
      const shadowMat = trackMaterial(new THREE.MeshBasicMaterial({ color: FOG_COLOR, transparent: true, opacity: BLOB_SHADOW_MAX_OPACITY, depthWrite: false }))
      const shadow = new THREE.Mesh(shadowGeom, shadowMat)
      shadow.rotation.x = -Math.PI / 2
      shadow.position.y = BLOB_SHADOW_Y
      shadow.renderOrder = -1
      playerGroup.add(shadow)
      // Store refs on group for sync
      ;(playerGroup as any).__body = body
      ;(playerGroup as any).__visor = visor
      ;(playerGroup as any).__shadow = shadow
      scene.add(playerGroup)
      ;(scene as any).__playerGroup = playerGroup

      // --- Obstacle pool ---
      const boxGeom = trackGeometry(new THREE.BoxGeometry(1, 1, 1))
      const poolSize = 24
      for (let i = 0; i < poolSize; i++) {
        const mesh = new THREE.Mesh(boxGeom, tallMat)
        mesh.visible = false
        scene.add(mesh)
        obstacleMeshPoolRef.current.push(mesh)
      }
    }

    // --- Cleanup ---
    function cleanup() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      const renderer = rendererRef.current
      const scene = sceneRef.current
      if (scene) {
        trackGroupsRef.current.forEach((g) => scene.remove(g))
        trackGroupsRef.current = []
        const playerGroup = (scene as any).__playerGroup
        if (playerGroup) scene.remove(playerGroup)
        obstacleMeshPoolRef.current.forEach((m) => scene.remove(m))
        obstacleMeshPoolRef.current = []
      }
      if (renderer) {
        renderer.dispose()
        renderer.forceContextLoss()
        const canvas = renderer.domElement
        if (canvas && canvas.parentElement) canvas.parentElement.removeChild(canvas)
      }
      rendererRef.current = null
      sceneRef.current = null
      cameraRef.current = null
      disposeTracked()
    }

    // --- Resize handler ---
    function onResize() {
      const renderer = rendererRef.current
      const camera = cameraRef.current
      const container = containerRef.current
      if (!renderer || !camera || !container) return
      const w = container.clientWidth
      const h = container.clientHeight
      if (w === 0 || h === 0) return
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, true)
    }

    // --- Visibility change (auto-pause) ---
    function onVisibilityChange() {
      if (document.hidden && runningRef.current) {
        runningRef.current = false
        onAutoPause()
      }
    }

    // --- Frame loop ---
    function loop(now: number) {
      rafRef.current = requestAnimationFrame(loop)
      const dt = Math.min(100, now - lastTimeRef.current) // clamp dt
      dtRef.current = dt
      lastTimeRef.current = now

      if (runningRef.current && stateRef.current) {
        accRef.current += dt
        let steps = 0
        const STEP_MS = 1000 / 60
        while (accRef.current >= STEP_MS && steps < 5) {
          stateRef.current = tick(stateRef.current)
          accRef.current -= STEP_MS
          steps++
        }
        if (steps === 5) accRef.current = 0 // drop backlog

        if (stateRef.current.status === 'over') {
          runningRef.current = false
          onGameOver(Math.floor(stateRef.current.distance))
        } else if (now - lastScoreEmitRef.current > 100) {
          lastScoreEmitRef.current = now
          onScoreChange(Math.floor(stateRef.current.distance))
          if (onSpeedChange) onSpeedChange(stateRef.current.speed)
        }
      }

      syncScene()
      rendererRef.current?.render(sceneRef.current!, cameraRef.current!)
    }

    // --- Sync scene with logic state ---
    function syncScene() {
      const state = stateRef.current
      if (!state) return
      const scene = sceneRef.current
      const camera = cameraRef.current
      const playerGroup = (scene as any).__playerGroup
      if (!playerGroup || !camera) return

      const dt = dtRef.current
      const speed = state.speed

      // Player position: use the simulated x directly so the model is always where the
      // hitbox is (the logic already eases x toward the lane at LATERAL_SPEED).
      const playerX = state.x
      playerGroup.position.x = playerX

      // Player vertical position
      const body = (playerGroup as any).__body
      const visor = (playerGroup as any).__visor
      const shadow = (playerGroup as any).__shadow
      if (body) body.position.y = PLAYER_HEIGHT / 2 + state.y
      if (visor) visor.position.y = PLAYER_HEIGHT * 0.6 + state.y
      // Shadow opacity/scale based on jump height
      if (shadow) {
        const heightFactor = Math.max(0, 1 - state.y / 3)
        shadow.material.opacity = BLOB_SHADOW_MAX_OPACITY * heightFactor
        shadow.scale.setScalar(heightFactor)
      }

      // Camera follow with slight parallax
      camera.position.x += (playerX * CAMERA_X_FACTOR - camera.position.x) * 0.1
      camera.lookAt(playerX * LOOK_AT_X_FACTOR, LOOK_AT_Y, LOOK_AT_Z)

      // Recycle track segments - world moves toward player (+z direction)
      // Only scroll while the game is actually running, so the floor stops together with
      // the obstacles on pause and game over.
      const scrolling = runningRef.current && state.status === 'running'
      const totalLength = SEGMENT_COUNT * SEGMENT_LENGTH
      trackGroupsRef.current.forEach((group) => {
        if (scrolling) group.position.z += speed * (dt / 1000)
        if (group.position.z > CAMERA_Z + SEGMENT_LENGTH / 2) {
          group.position.z -= totalLength
        }
      })

      // Sync obstacles from pool
      const pool = obstacleMeshPoolRef.current
      const tallMat = tallMatRef.current!
      const lowMat = lowMatRef.current!
      let poolIndex = 0
      for (const obs of state.obstacles) {
        let mesh = pool[poolIndex++]
        if (!mesh) {
          // Should not happen with poolSize=24
          const boxGeom = new THREE.BoxGeometry(1, 1, 1)
          mesh = new THREE.Mesh(boxGeom, obs.kind === 'tall' ? tallMat : lowMat)
          scene!.add(mesh)
          pool.push(mesh)
        }
        mesh.visible = true
        mesh.position.set(obs.x, obs.height / 2, obs.z)
        mesh.scale.set(obs.width, obs.height, obs.depth)
        mesh.material = obs.kind === 'tall' ? tallMat : lowMat
      }
      // Hide unused pool meshes
      for (let i = poolIndex; i < pool.length; i++) {
        pool[i].visible = false
      }
    }

    // --- Public handle (passed up via the handleRef prop) ---
    useEffect(() => {
      if (!handleRef) return
      handleRef.current = {
        start() {
          if (runningRef.current) return
          stateRef.current = createInitialState()
          runningRef.current = true
          lastTimeRef.current = performance.now()
          accRef.current = 0
          lastScoreEmitRef.current = 0
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(loop)
          }
        },
        pause() {
          runningRef.current = false
        },
        resume() {
          if (runningRef.current) return
          runningRef.current = true
          lastTimeRef.current = performance.now()
          if (rafRef.current === null) {
            rafRef.current = requestAnimationFrame(loop)
          }
        },
        input(action: 'left' | 'right' | 'jump') {
          const state = stateRef.current
          if (!state || state.status === 'over') return
          if (action === 'left') {
            stateRef.current = shiftLane(state, -1)
          } else if (action === 'right') {
            stateRef.current = shiftLane(state, 1)
          } else if (action === 'jump') {
            stateRef.current = queueJump(state)
          }
        },
      }
      return () => {
        handleRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [handleRef])

    // --- Lifecycle ---
    useEffect(() => {
      initScene()
      onResize()
      window.addEventListener('resize', onResize)
      document.addEventListener('visibilitychange', onVisibilityChange)
      return () => {
        window.removeEventListener('resize', onResize)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        cleanup()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    return (
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-xl border border-dark-700 bg-dark-950 touch-none select-none"
        style={{ aspectRatio: '4 / 3' }}
        aria-label="Neon Runner game viewport"
      />
    )
}

export default RunnerViewport