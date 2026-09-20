import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { ArAdapter } from './ar/types'

const COIN_COUNT = 10
const COIN_MIN_R = 0.8
const COIN_MAX_R = 2.6
const FIELD_R = 3
const RUN_SPEED = 2.2 // локальных единиц в секунду; персонаж ростом 1
const PICK_R = 0.45

export interface GameEvents {
  onScore(score: number, total: number): void
  onWin(): void
}

export async function createGame(ar: ArAdapter, input: { x: number; y: number }, events: GameEvents) {
  // Всё игровое живёт в world: его позиция — точка размещения, масштаб — слайдер
  const world = new THREE.Group()
  world.visible = false
  ar.scene.add(world)
  ar.scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 2.2))
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.position.set(2, 5, 3)
  ar.scene.add(sun)

  const gltf = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/RobotExpressive.glb`)
  const model = gltf.scene
  const box = new THREE.Box3().setFromObject(model)
  model.scale.setScalar(1 / (box.max.y - box.min.y))
  const hero = new THREE.Group()
  hero.add(model)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.35, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
  )
  shadow.position.y = 0.005
  hero.add(shadow)
  world.add(hero)

  const mixer = new THREE.AnimationMixer(model)
  const actions = new Map(gltf.animations.map((c) => [c.name, mixer.clipAction(c)]))
  let current: THREE.AnimationAction | undefined
  const play = (name: string) => {
    const next = actions.get(name)
    if (!next || next === current) return
    next.reset().fadeIn(0.2).play()
    current?.fadeOut(0.2)
    current = next
  }

  const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24).rotateX(Math.PI / 2)
  const coinMat = new THREE.MeshStandardMaterial({ color: 0xffc83d, metalness: 0.6, roughness: 0.3, emissive: 0x553300 })
  let coins: THREE.Mesh[] = []
  let score = 0
  let won = false

  const reset = () => {
    coins.forEach((c) => world.remove(c))
    coins = Array.from({ length: COIN_COUNT }, (_, i) => {
      const a = (i / COIN_COUNT) * Math.PI * 2 + Math.random() * 0.5
      const r = COIN_MIN_R + Math.random() * (COIN_MAX_R - COIN_MIN_R)
      const coin = new THREE.Mesh(coinGeo, coinMat)
      coin.position.set(Math.cos(a) * r, 0.3, Math.sin(a) * r)
      world.add(coin)
      return coin
    })
    score = 0
    won = false
    t = 0
    hero.position.set(0, 0, 0)
    events.onScore(score, COIN_COUNT)
    play('Wave')
  }

  const fwd = new THREE.Vector3()
  const right = new THREE.Vector3()
  const move = new THREE.Vector3()
  const up = new THREE.Vector3(0, 1, 0)
  let t = 0

  ar.onFrame((dt) => {
    if (!world.visible) return
    t += dt
    mixer.update(dt)

    const mag = Math.hypot(input.x, input.y)
    if (mag > 0.12 && !won) {
      // Движение относительно взгляда камеры, спроецированного на поверхность
      ar.camera.getWorldDirection(fwd).setY(0).normalize()
      right.crossVectors(fwd, up)
      move.copy(right).multiplyScalar(input.x).addScaledVector(fwd, input.y)
      hero.position.addScaledVector(move, RUN_SPEED * Math.min(mag, 1) * dt)
      if (hero.position.length() > FIELD_R) hero.position.setLength(FIELD_R)
      hero.rotation.y = Math.atan2(move.x, move.z)
      play(mag > 0.6 ? 'Running' : 'Walking')
    } else if (!won && current !== actions.get('Wave')) {
      play('Idle')
    } else if (!won && t > 2) {
      play('Idle')
    }

    for (const coin of coins) {
      if (!coin.visible) continue
      coin.rotation.y += dt * 3
      coin.position.y = 0.3 + Math.sin(t * 3 + coin.position.x) * 0.04
      if (Math.hypot(coin.position.x - hero.position.x, coin.position.z - hero.position.z) < PICK_R) {
        coin.visible = false
        events.onScore(++score, COIN_COUNT)
        if (score === COIN_COUNT) {
          won = true
          play('Dance')
          events.onWin()
        }
      }
    }
  })

  return {
    get placed() {
      return world.visible
    },
    placeAt(p: THREE.Vector3) {
      world.position.copy(p)
      if (!world.visible) reset()
      world.visible = true
      t = 0
    },
    unplace() {
      world.visible = false
    },
    setScale(s: number) {
      world.scale.setScalar(s)
    },
    reset,
  }
}
