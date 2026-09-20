import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { raycastFloor, type ArAdapter } from './types'

/** Dev-режим для ПК (?ar=mock): орбит-камера и «стол» вместо камеры телефона. */
export function startMock(canvas: HTMLCanvasElement): ArAdapter {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x26323f)
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 100)
  camera.position.set(0, 2, 2)

  const table = new THREE.Mesh(
    new THREE.CircleGeometry(4, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8a6a4a }),
  )
  table.position.y = -0.001
  scene.add(table, new THREE.GridHelper(8, 16, 0xffffff, 0x555555))

  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, 0.3, 0)
  controls.maxPolarAngle = Math.PI / 2 - 0.05

  const resize = () => {
    renderer.setSize(innerWidth, innerHeight, false)
    camera.aspect = innerWidth / innerHeight
    camera.updateProjectionMatrix()
  }
  addEventListener('resize', resize)
  resize()

  const frameCbs: Array<(dt: number) => void> = []
  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.1)
    controls.update()
    frameCbs.forEach((cb) => cb(dt))
    renderer.render(scene, camera)
  })

  return {
    scene,
    camera,
    renderer,
    trackingState: 'normal',
    hitTestFloor: (x, y) => raycastFloor(camera, x, y),
    onFrame: (cb) => frameCbs.push(cb),
    onTracking: () => {},
  }
}
