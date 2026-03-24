import { afterEach, vi } from 'vitest'

class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

class PointerEventMock extends MouseEvent {
  pointerId: number

  constructor(type: string, init: MouseEventInit & { pointerId?: number } = {}) {
    super(type, init)
    this.pointerId = init.pointerId ?? 1
  }
}

function createCanvasContext() {
  return {
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    roundRect: vi.fn(),
    setTransform: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn((text: string) => ({
      width: text.length * 6.4,
    })),
  } as unknown as CanvasRenderingContext2D
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock)
vi.stubGlobal('PointerEvent', PointerEventMock)
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  callback(0)
  return 1
})
vi.stubGlobal('cancelAnimationFrame', vi.fn())

Object.defineProperty(window, 'devicePixelRatio', {
  configurable: true,
  value: 1,
})

Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
  configurable: true,
  get() {
    const widthFromData = Number.parseFloat(this.getAttribute('data-test-width') ?? '')
    const widthFromStyle = Number.parseFloat((this as HTMLElement).style.width)
    return widthFromData || widthFromStyle || 640
  },
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value() {
    if (!(this as HTMLCanvasElement & { __ctx?: CanvasRenderingContext2D }).__ctx) {
      ;(this as HTMLCanvasElement & { __ctx?: CanvasRenderingContext2D }).__ctx = createCanvasContext()
    }

    return (this as HTMLCanvasElement & { __ctx?: CanvasRenderingContext2D }).__ctx ?? null
  },
})

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value() {
    const width = Number.parseFloat(this.style.width) || 640
    const height = Number.parseFloat(this.style.height) || 96

    return {
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: width,
      bottom: height,
      width,
      height,
      toJSON() {
        return this
      },
    }
  },
})

Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  configurable: true,
  value: vi.fn(),
})

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  configurable: true,
  value: vi.fn(() => true),
})

afterEach(() => {
  vi.clearAllMocks()
})
