import * as THREE from 'three'
import type { ArAdapter } from './ar/types'

const SAMPLE_EVERY_N_FRAMES = 3
const WINDOW_MS = 1500
const MIN_SAMPLES = 6
// Сетка лучей вокруг центра экрана, в долях меньшей стороны
const RINGS: Array<[radius: number, count: number]> = [
  [0, 1],
  [0.05, 6],
  [0.11, 8],
]

export type SurfaceKind = 'points' | 'plane'

/**
 * Оценка горизонтальной поверхности под центром экрана.
 * Одна feature-point шумит (кружка, край стола, выброс), поэтому берём медиану высот
 * по сетке лучей за последние WINDOW_MS и ставим прицел на плоскость y = медиана.
 */
export function createSurfaceReticle(ar: ArAdapter) {
  const reticle = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }),
  )
  reticle.renderOrder = 10
  reticle.visible = false
  ar.scene.add(reticle)

  const samples: Array<{ y: number; t: number }> = []
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const target = new THREE.Vector3()
  const center = new THREE.Vector2(0, 0)
  let frame = 0
  let smoothY: number | null = null
  let kind: SurfaceKind = 'plane'
  let active = false
  let radius = 0.3

  const sample = () => {
    const now = performance.now()
    const side = Math.min(innerWidth, innerHeight)
    for (const [r, n] of RINGS) {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const pts = ar.hitTestPoints(innerWidth / 2 + Math.cos(a) * r * side, innerHeight / 2 + Math.sin(a) * r * side)
        for (const p of pts) samples.push({ y: p.y, t: now })
      }
    }
    while (samples.length && now - samples[0].t > WINDOW_MS) samples.shift()
  }

  const median = () => {
    const ys = samples.map((s) => s.y).sort((a, b) => a - b)
    return ys[ys.length >> 1]
  }

  ar.onFrame((dt) => {
    if (!active) return
    if (frame++ % SAMPLE_EVERY_N_FRAMES === 0) sample()

    kind = samples.length >= MIN_SAMPLES ? 'points' : 'plane'
    const y = kind === 'points' ? median() : 0
    smoothY = smoothY === null ? y : THREE.MathUtils.damp(smoothY, y, 8, dt)

    plane.constant = -smoothY
    raycaster.setFromCamera(center, ar.camera)
    const hit = raycaster.ray.intersectPlane(plane, target)
    reticle.visible = !!hit
    if (hit) reticle.position.copy(hit)
    reticle.scale.setScalar(radius)
    reticle.material.color.set(kind === 'points' ? 0x3dff8a : 0xffd23d)
  })

  return {
    get kind() {
      return kind
    },
    get samples() {
      return samples.length
    },
    /** Текущая точка прицела или null, если камера смотрит мимо плоскости. */
    get point(): THREE.Vector3 | null {
      return active && reticle.visible ? reticle.position.clone() : null
    },
    setActive(on: boolean) {
      active = on
      reticle.visible = false
      if (on) {
        samples.length = 0
        smoothY = null
      }
    },
    setRadius(r: number) {
      radius = r
    },
  }
}
