import {
  findNearestSeriesPoint,
  normalizeRange,
  zoomRangeAtAnchor,
} from '../src/utils/timeline'

describe('timeline utilities', () => {
  it('normalizes reversed ranges and respects min span', () => {
    const result = normalizeRange(50, 10, 0, 100, 20)

    expect(result).toEqual({
      start: 10,
      end: 50,
    })
  })

  it('zooms around an anchor while staying inside bounds', () => {
    const result = zoomRangeAtAnchor(
      {
        start: 20,
        end: 80,
      },
      50,
      0.5,
      0,
      100,
      10,
    )

    expect(result.start).toBeCloseTo(35)
    expect(result.end).toBeCloseTo(65)
  })

  it('finds the nearest series point to the hover position', () => {
    const point = findNearestSeriesPoint(
      [
        { time: 100, value: 0.2 },
        { time: 200, value: 0.5 },
        { time: 400, value: 0.9 },
      ],
      240,
    )

    expect(point).toEqual({
      time: 200,
      value: 0.5,
    })
  })
})
