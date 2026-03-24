import type {
  TimelineAxisLabelContext,
  TimelineDateLike,
  TimelineRangeLabelContext,
  TimelineSeriesPoint,
  TimelineTooltipContext,
  TimelineTooltipPoint,
  TimelineValueKind,
} from '../types'

export type SerializedValueKind = TimelineValueKind

export interface InternalRange {
  start: number
  end: number
}

export interface NormalizedSeriesPoint {
  time: number
  value: number
}

const yearFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
})

const monthFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
})

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const minuteFormatter = new Intl.DateTimeFormat(undefined, {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

const secondFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

const timeWithSeparatorPattern = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/
const compactTimePattern = /^(\d{6})$/

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function isTimeString(input: string) {
  return timeWithSeparatorPattern.test(input) || compactTimePattern.test(input)
}

export function parseTimeString(input: string) {
  const trimmed = input.trim()
  const separatedMatch = trimmed.match(timeWithSeparatorPattern)

  if (separatedMatch) {
    const hours = Number.parseInt(separatedMatch[1], 10)
    const minutes = Number.parseInt(separatedMatch[2], 10)
    const seconds = Number.parseInt(separatedMatch[3], 10)

    return ((hours * 60 + minutes) * 60 + seconds) * 1000
  }

  const compactMatch = trimmed.match(compactTimePattern)

  if (compactMatch) {
    const [hoursText, minutesText, secondsText] = [
      compactMatch[1].slice(0, 2),
      compactMatch[1].slice(2, 4),
      compactMatch[1].slice(4, 6),
    ]

    return (
      (Number.parseInt(hoursText, 10) * 60 +
        Number.parseInt(minutesText, 10)) *
        60 +
      Number.parseInt(secondsText, 10)
    ) * 1000
  }

  throw new Error(`Invalid time value: ${input}`)
}

export function formatTimeString(timestamp: number) {
  const totalSeconds = Math.max(0, Math.floor(timestamp / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}

export function normalizeDateInput(input: TimelineDateLike) {
  if (input instanceof Date) {
    return input.getTime()
  }

  if (typeof input === 'number') {
    return input
  }

  if (isTimeString(input)) {
    return parseTimeString(input)
  }

  const parsed = new Date(input).getTime()

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid date value: ${String(input)}`)
  }

  return parsed
}

export function detectValueKind(value: TimelineDateLike | undefined): SerializedValueKind {
  if (value instanceof Date) {
    return 'date'
  }

  if (typeof value === 'number') {
    return 'number'
  }

  if (typeof value === 'string' && isTimeString(value)) {
    return 'time-string'
  }

  return 'string'
}

export function serializeDateInput(timestamp: number, kind: SerializedValueKind): TimelineDateLike {
  if (kind === 'date') {
    return new Date(timestamp)
  }

  if (kind === 'number') {
    return timestamp
  }

  if (kind === 'time-string') {
    return formatTimeString(timestamp)
  }

  return new Date(timestamp).toISOString()
}

export function normalizeRange(
  start: TimelineDateLike,
  end: TimelineDateLike,
  min: number,
  max: number,
  minSpan: number,
) {
  const totalSpan = Math.max(1, max - min)
  const effectiveMinSpan = Math.min(Math.max(minSpan, 1), totalSpan)
  const initialStart = clamp(Math.min(normalizeDateInput(start), normalizeDateInput(end)), min, max)
  const initialEnd = clamp(Math.max(normalizeDateInput(start), normalizeDateInput(end)), min, max)
  const initialSpan = Math.max(initialEnd - initialStart, effectiveMinSpan)

  let safeStart = clamp(initialStart, min, max - effectiveMinSpan)
  let safeEnd = safeStart + initialSpan

  if (safeEnd > max) {
    safeEnd = max
    safeStart = Math.max(min, safeEnd - initialSpan)
  }

  if (safeEnd - safeStart < effectiveMinSpan) {
    safeEnd = clamp(safeStart + effectiveMinSpan, min, max)
    safeStart = Math.max(min, safeEnd - effectiveMinSpan)
  }

  return {
    start: safeStart,
    end: safeEnd,
  }
}

export function getNormalizedSeries(series: TimelineSeriesPoint[]) {
  return series
    .map((point) => ({
      time: normalizeDateInput(point.time),
      value: Number(point.value),
    }))
    .filter((point) => Number.isFinite(point.time) && Number.isFinite(point.value))
    .sort((left, right) => left.time - right.time)
}

export function findNearestSeriesPoint(
  series: NormalizedSeriesPoint[],
  targetTime: number,
): TimelineTooltipPoint | undefined {
  if (series.length === 0) {
    return undefined
  }

  let left = 0
  let right = series.length - 1

  while (left < right) {
    const mid = Math.floor((left + right) / 2)

    if (series[mid].time < targetTime) {
      left = mid + 1
    } else {
      right = mid
    }
  }

  const current = series[left]
  const previous = series[Math.max(0, left - 1)]

  if (!previous) {
    return current
  }

  return Math.abs(current.time - targetTime) < Math.abs(previous.time - targetTime)
    ? current
    : previous
}

export function buildAxisTicks(min: number, max: number, tickCount: number) {
  const ticks: number[] = []
  const safeTickCount = Math.max(2, tickCount)
  const step = (max - min) / (safeTickCount - 1)

  for (let index = 0; index < safeTickCount; index += 1) {
    ticks.push(min + step * index)
  }

  return ticks
}

export function formatAxisLabel(
  timestamp: number,
  totalSpan: number,
  valueKind: SerializedValueKind = 'date',
) {
  if (valueKind === 'time-string') {
    return formatTimeString(timestamp)
  }

  const year = 1000 * 60 * 60 * 24 * 365
  const month = 1000 * 60 * 60 * 24 * 30
  const day = 1000 * 60 * 60 * 24

  if (totalSpan >= year * 2) {
    return yearFormatter.format(timestamp)
  }

  if (totalSpan >= month * 4) {
    return monthFormatter.format(timestamp)
  }

  if (totalSpan >= day * 2) {
    return dayFormatter.format(timestamp)
  }

  return minuteFormatter.format(timestamp)
}

export function formatSelectedLabel(
  timestamp: number,
  totalSpan: number,
  valueKind: SerializedValueKind = 'date',
) {
  if (valueKind === 'time-string') {
    return formatTimeString(timestamp)
  }

  const day = 1000 * 60 * 60 * 24

  if (totalSpan >= day) {
    return dayFormatter.format(timestamp)
  }

  if (totalSpan >= 1000 * 60 * 30) {
    return minuteFormatter.format(timestamp)
  }

  return secondFormatter.format(timestamp)
}

export function getAxisLabel(context: TimelineAxisLabelContext) {
  return formatAxisLabel(context.timestamp, context.totalSpan, context.valueKind)
}

export function getRangeLabel(context: TimelineRangeLabelContext) {
  return formatSelectedLabel(context.timestamp, context.totalSpan, context.valueKind)
}

export function getTooltipContent(context: TimelineTooltipContext) {
  return [formatSelectedLabel(context.time, context.totalSpan, context.valueKind)]
}

export function asTooltipLines(content: string | string[]) {
  return Array.isArray(content) ? content : [content]
}

export function zoomRangeAtAnchor(
  range: InternalRange,
  anchorTime: number,
  scale: number,
  min: number,
  max: number,
  minSpan: number,
) {
  const totalSpan = Math.max(1, max - min)
  const currentSpan = Math.max(range.end - range.start, minSpan)
  const nextSpan = clamp(currentSpan * scale, Math.min(minSpan, totalSpan), totalSpan)
  const anchorRatio =
    currentSpan <= 0 ? 0.5 : clamp((anchorTime - range.start) / currentSpan, 0, 1)

  let start = anchorTime - nextSpan * anchorRatio
  let end = start + nextSpan

  if (start < min) {
    end += min - start
    start = min
  }

  if (end > max) {
    start -= end - max
    end = max
  }

  if (start < min) {
    start = min
  }

  if (end - start < Math.min(minSpan, totalSpan)) {
    end = clamp(start + Math.min(minSpan, totalSpan), min, max)
    start = Math.max(min, end - Math.min(minSpan, totalSpan))
  }

  return {
    start,
    end,
  }
}
