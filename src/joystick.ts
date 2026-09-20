/** Экранный стик. value: x вправо, y вперёд (от пользователя), длина 0..1. */
export function createJoystick(base: HTMLElement, stick: HTMLElement) {
  const value = { x: 0, y: 0 }
  let pointerId: number | null = null

  const update = (e: PointerEvent) => {
    const r = base.getBoundingClientRect()
    const max = r.width / 2
    let dx = e.clientX - (r.left + max)
    let dy = e.clientY - (r.top + max)
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx *= max / len
      dy *= max / len
    }
    stick.style.transform = `translate(${dx}px, ${dy}px)`
    value.x = dx / max
    value.y = -dy / max
  }

  const release = (e: PointerEvent) => {
    if (e.pointerId !== pointerId) return
    pointerId = null
    value.x = value.y = 0
    stick.style.transform = ''
  }

  base.addEventListener('pointerdown', (e) => {
    pointerId = e.pointerId
    base.setPointerCapture(e.pointerId)
    update(e)
  })
  base.addEventListener('pointermove', (e) => e.pointerId === pointerId && update(e))
  base.addEventListener('pointerup', release)
  base.addEventListener('pointercancel', release)

  return value
}
