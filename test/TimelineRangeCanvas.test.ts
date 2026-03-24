import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { vi } from 'vitest'
import TimelineRangeCanvas from '../src/components/TimelineRangeCanvas.vue'

const min = new Date('1988-01-01T00:00:00Z')
const max = new Date('1999-12-31T00:00:00Z')
const initialRange: [Date, Date] = [
  new Date('1988-10-03T00:00:00Z'),
  new Date('1990-09-15T00:00:00Z'),
]

const series = [
  { time: new Date('1988-01-01T00:00:00Z'), value: 0.18 },
  { time: new Date('1990-01-01T00:00:00Z'), value: 0.52 },
  { time: new Date('1992-01-01T00:00:00Z'), value: 0.34 },
]

async function mountComponent(extraProps: Record<string, unknown> = {}) {
  const wrapper = mount(TimelineRangeCanvas, {
    props: {
      modelValue: initialRange,
      min,
      max,
      height: 110,
      series,
      ...extraProps,
    },
  })

  await nextTick()
  await nextTick()

  return wrapper
}

describe('TimelineRangeCanvas', () => {
  it('uses a custom axis formatter during canvas drawing', async () => {
    const axisLabelFormatter = vi.fn(({ index }: { index: number }) => `tick-${index}`)
    const wrapper = await mountComponent({
      axisLabelFormatter,
    })

    expect(axisLabelFormatter).toHaveBeenCalled()

    const canvas = wrapper.find('canvas').element as HTMLCanvasElement & {
      __ctx?: CanvasRenderingContext2D & { fillText: ReturnType<typeof vi.fn> }
    }
    const fillTextCalls = canvas.__ctx?.fillText.mock.calls ?? []
    const renderedAxisLabels = fillTextCalls.map((call) => call[0])

    expect(renderedAxisLabels).toContain('tick-0')
    expect(renderedAxisLabels).toContain('tick-4')
  })

  it('shows a custom tooltip when hovering over the track', async () => {
    const tooltipFormatter = vi.fn(() => ['1989-03-01', 'Value 0.61'])
    const wrapper = await mountComponent({
      tooltipFormatter,
    })
    const canvas = wrapper.find('canvas').element

    canvas.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        clientX: 180,
        clientY: 52,
        pointerId: 1,
      }),
    )
    await nextTick()

    expect(tooltipFormatter).toHaveBeenCalled()
    expect(wrapper.text()).toContain('1989-03-01')
    expect(wrapper.text()).toContain('Value 0.61')
  })

  it('emits a narrower range when zooming in with the wheel', async () => {
    const wrapper = await mountComponent()
    const canvas = wrapper.find('canvas').element
    const originalSpan = initialRange[1].getTime() - initialRange[0].getTime()

    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        clientX: 240,
        clientY: 52,
        deltaY: -120,
      }),
    )
    await nextTick()

    const changes = wrapper.emitted('change')
    expect(changes).toBeTruthy()

    const zoomedRange = changes?.[0]?.[0] as [Date, Date]
    const zoomedSpan = zoomedRange[1].getTime() - zoomedRange[0].getTime()

    expect(zoomedSpan).toBeLessThan(originalSpan)
  })
})
