export type TimelineDateLike = string | number | Date

export type TimelineRangeValue = [TimelineDateLike, TimelineDateLike]

export type TimelineValueKind = 'date' | 'number' | 'string' | 'time-string'

export interface TimelineSeriesPoint {
  time: TimelineDateLike
  value: number
}

export interface TimelineAxisLabelContext {
  timestamp: number
  date: Date
  totalSpan: number
  index: number
  tickCount: number
  valueKind: TimelineValueKind
}

export interface TimelineRangeLabelContext {
  timestamp: number
  date: Date
  totalSpan: number
  side: 'start' | 'end'
  valueKind: TimelineValueKind
}

export interface TimelineTooltipPoint {
  time: number
  value: number
}

export interface TimelineTooltipContext {
  time: number
  date: Date
  totalSpan: number
  valueKind: TimelineValueKind
  selection: {
    start: number
    end: number
  }
  nearestPoint?: TimelineTooltipPoint
}

export type TimelineAxisLabelFormatter = (context: TimelineAxisLabelContext) => string

export type TimelineRangeLabelFormatter = (context: TimelineRangeLabelContext) => string

export type TimelineTooltipFormatter = (
  context: TimelineTooltipContext,
) => string | string[]
