<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type {
  TimelineAxisLabelFormatter,
  TimelineDateLike,
  TimelineRangeLabelFormatter,
  TimelineRangeValue,
  TimelineSeriesPoint,
  TimelineTooltipFormatter,
} from '../types'
import {
  asTooltipLines,
  buildAxisTicks,
  clamp,
  detectValueKind,
  getAxisLabel,
  getRangeLabel,
  getTooltipContent,
  normalizeDateInput,
  normalizeRange,
  serializeDateInput,
  zoomRangeAtAnchor,
  type InternalRange,
} from '../utils/timeline'

type DragMode = 'move' | 'resize-start' | 'resize-end' | 'create'

interface DragState {
  pointerId: number
  mode: DragMode
  offsetToStart: number
  anchorTime: number
  originRange: InternalRange
}

interface HoverState {
  x: number
  y: number
  lines: string[]
}

interface CanvasPoint {
  x: number
  y: number
}

const props = withDefaults(
  defineProps<{
    modelValue?: TimelineRangeValue
    min: TimelineDateLike
    max: TimelineDateLike
    minSpan?: number
    height?: number
    axisTickCount?: number
    handleWidth?: number
    series?: TimelineSeriesPoint[]
    disabled?: boolean
    enableWheelZoom?: boolean
    wheelZoomStep?: number
    axisLabelFormatter?: TimelineAxisLabelFormatter
    rangeLabelFormatter?: TimelineRangeLabelFormatter
    tooltipFormatter?: TimelineTooltipFormatter
    tooltipDisabled?: boolean
    background?: string
    selectionBackground?: string
  }>(),
  {
    modelValue: undefined,
    minSpan: 1000 * 60 * 60 * 24,
    height: 96,
    axisTickCount: 5,
    handleWidth: 8,
    series: () => [],
    disabled: false,
    enableWheelZoom: true,
    wheelZoomStep: 0.14,
    axisLabelFormatter: undefined,
    rangeLabelFormatter: undefined,
    tooltipFormatter: undefined,
    tooltipDisabled: false,
    background: '#fdfefe',
    selectionBackground: 'rgba(135, 149, 218, 0.14)',
  },
)

const emit = defineEmits<{
  (event: 'update:modelValue', value: TimelineRangeValue): void
  (event: 'change', value: TimelineRangeValue): void
}>()

const rootRef = ref<HTMLDivElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const canvasWidth = ref(960)
const selection = ref<InternalRange>({
  start: 0,
  end: 1,
})
const dragState = ref<DragState | null>(null)
const hoverState = ref<HoverState | null>(null)

let resizeObserver: ResizeObserver | null = null
let rafId = 0

const bounds = computed(() => {
  const min = normalizeDateInput(props.min)
  const max = normalizeDateInput(props.max)

  if (max <= min) {
    return {
      min,
      max: min + 1,
      totalSpan: 1,
      minSpan: 1,
    }
  }

  const totalSpan = max - min
  const minSpan = Math.min(Math.max(props.minSpan, 1), totalSpan)

  return {
    min,
    max,
    totalSpan,
    minSpan,
  }
})

const valueKind = computed(() => detectValueKind(props.modelValue?.[0] ?? props.min))
const tooltipStyle = computed(() => {
  if (!hoverState.value) {
    return {}
  }

  return {
    left: `${hoverState.value.x}px`,
    top: `${hoverState.value.y}px`,
  }
})

function getLayout(width = canvasWidth.value, height = props.height) {
  const sidePadding = 18
  const trackTop = 28
  const bottomPadding = 22
  const trackHeight = Math.max(34, height - trackTop - bottomPadding)

  return {
    width,
    height,
    sidePadding,
    trackTop,
    trackHeight,
    trackBottom: trackTop + trackHeight,
    trackWidth: Math.max(48, width - sidePadding * 2),
    axisLabelY: 16,
    valueLabelY: height - 10,
  }
}

function rangesEqual(left: InternalRange, right: InternalRange) {
  return Math.abs(left.start - right.start) < 0.5 && Math.abs(left.end - right.end) < 0.5
}

function timeToX(timestamp: number, layout = getLayout()) {
  const ratio = (timestamp - bounds.value.min) / bounds.value.totalSpan
  return layout.sidePadding + ratio * layout.trackWidth
}

function xToTime(x: number, layout = getLayout()) {
  const clampedX = clamp(x, layout.sidePadding, layout.sidePadding + layout.trackWidth)
  const ratio = (clampedX - layout.sidePadding) / layout.trackWidth
  return bounds.value.min + ratio * bounds.value.totalSpan
}

function serializeRange(range: InternalRange): TimelineRangeValue {
  return [
    serializeDateInput(range.start, valueKind.value),
    serializeDateInput(range.end, valueKind.value),
  ]
}

function syncSelectionFromProps() {
  const defaultRange = props.modelValue ?? [props.min, props.max]
  selection.value = normalizeRange(
    defaultRange[0],
    defaultRange[1],
    bounds.value.min,
    bounds.value.max,
    bounds.value.minSpan,
  )
}

function emitRange(isFinal = false) {
  const serialized = serializeRange(selection.value)
  emit('update:modelValue', serialized)

  if (isFinal) {
    emit('change', serialized)
  }
}

function getAxisLabelText(timestamp: number, index: number, tickCount: number) {
  return props.axisLabelFormatter?.({
    timestamp,
    date: new Date(timestamp),
    totalSpan: bounds.value.totalSpan,
    index,
    tickCount,
    valueKind: valueKind.value,
  }) ?? getAxisLabel({
    timestamp,
    date: new Date(timestamp),
    totalSpan: bounds.value.totalSpan,
    index,
    tickCount,
    valueKind: valueKind.value,
  })
}

function getRangeLabelText(timestamp: number, side: 'start' | 'end') {
  return props.rangeLabelFormatter?.({
    timestamp,
    date: new Date(timestamp),
    totalSpan: bounds.value.totalSpan,
    side,
    valueKind: valueKind.value,
  }) ?? getRangeLabel({
    timestamp,
    date: new Date(timestamp),
    totalSpan: bounds.value.totalSpan,
    side,
    valueKind: valueKind.value,
  })
}

function scheduleDraw() {
  cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(drawCanvas)
}

function resizeCanvas() {
  const canvas = canvasRef.value

  if (!canvas) {
    return
  }

  const width = Math.max(rootRef.value?.clientWidth ?? 0, 320)
  const ratio = window.devicePixelRatio || 1

  canvasWidth.value = width
  canvas.width = Math.floor(width * ratio)
  canvas.height = Math.floor(props.height * ratio)
  canvas.style.width = `${width}px`
  canvas.style.height = `${props.height}px`

  scheduleDraw()
}

function isWithinTrack(y: number) {
  const layout = getLayout()
  return y >= layout.trackTop && y <= layout.trackBottom
}

function getActionAtPoint(x: number, y: number): DragMode | null {
  if (!isWithinTrack(y)) {
    return null
  }

  const layout = getLayout()
  const selectedStartX = timeToX(selection.value.start, layout)
  const selectedEndX = timeToX(selection.value.end, layout)
  const handleZone = Math.max(props.handleWidth + 4, 10)

  if (Math.abs(x - selectedStartX) <= handleZone) {
    return 'resize-start'
  }

  if (Math.abs(x - selectedEndX) <= handleZone) {
    return 'resize-end'
  }

  if (x > selectedStartX && x < selectedEndX) {
    return 'move'
  }

  return 'create'
}

function updateCursor(x: number, y: number) {
  const canvas = canvasRef.value

  if (!canvas || props.disabled) {
    return
  }

  const action = getActionAtPoint(x, y)

  if (action === 'resize-start' || action === 'resize-end') {
    canvas.style.cursor = 'ew-resize'
    return
  }

  if (action === 'move') {
    canvas.style.cursor = 'grab'
    return
  }

  if (action === 'create') {
    canvas.style.cursor = 'crosshair'
    return
  }

  canvas.style.cursor = 'default'
}

function hideTooltip() {
  hoverState.value = null
}

function getCanvasPoint(event: PointerEvent | MouseEvent | WheelEvent): CanvasPoint {
  const canvas = canvasRef.value

  if (!canvas) {
    return {
      x: 0,
      y: 0,
    }
  }

  const rect = canvas.getBoundingClientRect()

  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
}

function updateTooltip(point: CanvasPoint) {
  if (props.tooltipDisabled || !isWithinTrack(point.y)) {
    hideTooltip()
    return
  }

  const time = xToTime(point.x)
  const content =
    props.tooltipFormatter?.({
      time,
      date: new Date(time),
      totalSpan: bounds.value.totalSpan,
      valueKind: valueKind.value,
      selection: {
        start: selection.value.start,
        end: selection.value.end,
      },
    }) ??
    getTooltipContent({
      time,
      date: new Date(time),
      totalSpan: bounds.value.totalSpan,
      valueKind: valueKind.value,
      selection: {
        start: selection.value.start,
        end: selection.value.end,
      },
    })

  const lines = asTooltipLines(content).filter(Boolean)

  if (lines.length === 0) {
    hideTooltip()
    return
  }

  hoverState.value = {
    x: clamp(point.x, 36, canvasWidth.value - 36),
    y: Math.max(point.y, 42),
    lines,
  }
}

function setSelection(nextRange: InternalRange, isFinal = false) {
  if (rangesEqual(selection.value, nextRange)) {
    if (isFinal) {
      emitRange(true)
    }
    return
  }

  selection.value = nextRange
  emitRange(isFinal)
}

function drawRangeLabel(
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof getLayout>,
  x: number,
  text: string,
  align: CanvasTextAlign,
) {
  const paddingX = 7
  const boxHeight = 18
  const textWidth = ctx.measureText(text).width
  const desiredX = align === 'right' ? x - textWidth - paddingX * 2 - 8 : x + 8
  const boxX = clamp(desiredX, layout.sidePadding, layout.width - textWidth - paddingX * 2 - layout.sidePadding)
  const boxY = layout.valueLabelY - boxHeight + 1

  ctx.fillStyle = 'rgba(255, 255, 255, 0.86)'
  ctx.beginPath()
  ctx.roundRect(boxX, boxY, textWidth + paddingX * 2, boxHeight, 9)
  ctx.fill()

  ctx.fillStyle = '#65759c'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2 + 0.5)
}

function drawCanvas() {
  const canvas = canvasRef.value

  if (!canvas) {
    return
  }

  const context = canvas.getContext('2d')

  if (!context) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  const layout = getLayout()
  const selectedStartX = timeToX(selection.value.start, layout)
  const selectedEndX = timeToX(selection.value.end, layout)
  const handleWidth = props.handleWidth
  const handleInset = 2
  const handleHeight = layout.trackHeight - handleInset * 2

  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, layout.width, layout.height)

  context.fillStyle = '#6a7594'
  context.font = '12px "Segoe UI", "PingFang SC", sans-serif'
  context.textBaseline = 'middle'

  const ticks = buildAxisTicks(bounds.value.min, bounds.value.max, props.axisTickCount)
  ticks.forEach((tick, index) => {
    const x = timeToX(tick, layout)
    const text = getAxisLabelText(tick, index, ticks.length)

    if (index === 0) {
      context.textAlign = 'left'
    } else if (index === ticks.length - 1) {
      context.textAlign = 'right'
    } else {
      context.textAlign = 'center'
    }

    context.fillText(text, x, layout.axisLabelY)
  })

  context.fillStyle = props.background
  context.strokeStyle = '#dbe2f3'
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(layout.sidePadding, layout.trackTop, layout.trackWidth, layout.trackHeight, 12)
  context.fill()
  context.stroke()

  context.fillStyle = 'rgba(247, 249, 253, 0.82)'
  context.fillRect(layout.sidePadding, layout.trackTop, selectedStartX - layout.sidePadding, layout.trackHeight)
  context.fillRect(
    selectedEndX,
    layout.trackTop,
    layout.sidePadding + layout.trackWidth - selectedEndX,
    layout.trackHeight,
  )

  context.fillStyle = props.selectionBackground
  context.strokeStyle = '#a7b2de'
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(selectedStartX, layout.trackTop, selectedEndX - selectedStartX, layout.trackHeight, 10)
  context.fill()
  context.stroke()

  context.fillStyle = '#8d98d4'
  context.fillRect(selectedStartX, layout.trackTop + 2, selectedEndX - selectedStartX, 4)

  context.fillStyle = '#ffffff'
  context.strokeStyle = '#8794d0'
  context.lineWidth = 1
  context.beginPath()
  context.roundRect(
    selectedStartX - handleWidth / 2,
    layout.trackTop + handleInset,
    handleWidth,
    handleHeight,
    4,
  )
  context.fill()
  context.stroke()
  context.beginPath()
  context.roundRect(
    selectedEndX - handleWidth / 2,
    layout.trackTop + handleInset,
    handleWidth,
    handleHeight,
    4,
  )
  context.fill()
  context.stroke()

  context.fillStyle = '#7f8bc6'
  const gripHeight = 10
  context.fillRect(
    selectedStartX - 1.5,
    layout.trackTop + layout.trackHeight / 2 - gripHeight / 2,
    1,
    gripHeight,
  )
  context.fillRect(
    selectedStartX + 1.5,
    layout.trackTop + layout.trackHeight / 2 - gripHeight / 2,
    1,
    gripHeight,
  )
  context.fillRect(
    selectedEndX - 1.5,
    layout.trackTop + layout.trackHeight / 2 - gripHeight / 2,
    1,
    gripHeight,
  )
  context.fillRect(
    selectedEndX + 1.5,
    layout.trackTop + layout.trackHeight / 2 - gripHeight / 2,
    1,
    gripHeight,
  )

  context.font = '12px "Segoe UI", "PingFang SC", sans-serif'
  drawRangeLabel(context, layout, selectedStartX, getRangeLabelText(selection.value.start, 'start'), 'right')
  drawRangeLabel(context, layout, selectedEndX, getRangeLabelText(selection.value.end, 'end'), 'left')
}

function handlePointerDown(event: PointerEvent) {
  if (props.disabled || event.button !== 0) {
    return
  }

  const canvas = canvasRef.value

  if (!canvas) {
    return
  }

  const point = getCanvasPoint(event)
  const mode = getActionAtPoint(point.x, point.y)

  if (!mode) {
    return
  }

  const anchorTime = xToTime(point.x)
  dragState.value = {
    pointerId: event.pointerId,
    mode,
    offsetToStart: anchorTime - selection.value.start,
    anchorTime,
    originRange: { ...selection.value },
  }

  canvas.setPointerCapture(event.pointerId)
  canvas.style.cursor = mode === 'move' ? 'grabbing' : mode === 'create' ? 'crosshair' : 'ew-resize'

  if (mode === 'create') {
    setSelection(
      normalizeRange(
        anchorTime,
        anchorTime + bounds.value.minSpan,
        bounds.value.min,
        bounds.value.max,
        bounds.value.minSpan,
      ),
    )
    scheduleDraw()
  }

  updateTooltip(point)
}

function applyDrag(pointX: number) {
  if (!dragState.value) {
    return
  }

  const pointerTime = xToTime(pointX)
  const current = dragState.value
  let nextRange = selection.value

  if (current.mode === 'move') {
    const span = current.originRange.end - current.originRange.start
    let nextStart = pointerTime - current.offsetToStart
    nextStart = clamp(nextStart, bounds.value.min, bounds.value.max - span)
    nextRange = {
      start: nextStart,
      end: nextStart + span,
    }
  }

  if (current.mode === 'resize-start') {
    nextRange = {
      start: clamp(pointerTime, bounds.value.min, selection.value.end - bounds.value.minSpan),
      end: selection.value.end,
    }
  }

  if (current.mode === 'resize-end') {
    nextRange = {
      start: selection.value.start,
      end: clamp(pointerTime, selection.value.start + bounds.value.minSpan, bounds.value.max),
    }
  }

  if (current.mode === 'create') {
    nextRange = normalizeRange(
      current.anchorTime,
      pointerTime,
      bounds.value.min,
      bounds.value.max,
      bounds.value.minSpan,
    )
  }

  setSelection(nextRange)
  scheduleDraw()
}

function handlePointerMove(event: PointerEvent) {
  const point = getCanvasPoint(event)

  if (!dragState.value) {
    updateCursor(point.x, point.y)
    updateTooltip(point)
    return
  }

  if (dragState.value.pointerId !== event.pointerId) {
    return
  }

  applyDrag(point.x)
  updateTooltip(point)
}

function handleWheel(event: WheelEvent) {
  if (props.disabled || !props.enableWheelZoom) {
    return
  }

  const point = getCanvasPoint(event)

  if (!isWithinTrack(point.y)) {
    return
  }

  event.preventDefault()

  const rawStep = clamp(props.wheelZoomStep, 0.02, 0.75)
  const scale = event.deltaY < 0 ? 1 - rawStep : 1 + rawStep
  const anchorTime = clamp(xToTime(point.x), selection.value.start, selection.value.end)
  const nextRange = zoomRangeAtAnchor(
    selection.value,
    anchorTime,
    scale,
    bounds.value.min,
    bounds.value.max,
    bounds.value.minSpan,
  )

  setSelection(nextRange, true)
  scheduleDraw()
  updateTooltip(point)
}

function finishInteraction(event: PointerEvent) {
  const canvas = canvasRef.value

  if (!dragState.value || dragState.value.pointerId !== event.pointerId) {
    return
  }

  dragState.value = null

  if (canvas?.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }

  if (canvas) {
    const point = getCanvasPoint(event)
    updateCursor(point.x, point.y)
    updateTooltip(point)
  }

  emitRange(true)
  scheduleDraw()
}

function handlePointerLeave() {
  if (dragState.value) {
    return
  }

  updateCursor(-1, -1)
  hideTooltip()
}

watch(
  () => [props.modelValue, props.min, props.max, props.minSpan],
  () => {
    syncSelectionFromProps()
    scheduleDraw()
  },
  { deep: true, immediate: true },
)

watch(
  () => [
    props.height,
    props.axisTickCount,
    props.handleWidth,
    props.disabled,
    props.enableWheelZoom,
    props.wheelZoomStep,
    props.background,
    props.selectionBackground,
  ],
  () => {
    nextTick(resizeCanvas)
  },
)

watch(
  () => [props.axisLabelFormatter, props.rangeLabelFormatter, props.tooltipFormatter, props.tooltipDisabled],
  () => {
    if (props.tooltipDisabled) {
      hideTooltip()
    }

    scheduleDraw()
  },
)

onMounted(() => {
  nextTick(() => {
    resizeCanvas()

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
    })

    if (rootRef.value) {
      resizeObserver.observe(rootRef.value)
    }
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  cancelAnimationFrame(rafId)
})
</script>

<template>
  <div ref="rootRef" class="timeline-range-canvas">
    <canvas
      ref="canvasRef"
      class="timeline-range-canvas__surface"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="finishInteraction"
      @pointercancel="finishInteraction"
      @pointerleave="handlePointerLeave"
      @wheel="handleWheel"
    />

    <div v-if="hoverState" class="timeline-range-canvas__tooltip" :style="tooltipStyle">
      <span
        v-for="line in hoverState.lines"
        :key="line"
        class="timeline-range-canvas__tooltip-line"
      >
        {{ line }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.timeline-range-canvas {
  position: relative;
  width: 100%;
}

.timeline-range-canvas__surface {
  display: block;
  width: 100%;
  touch-action: none;
  user-select: none;
  border-radius: 16px;
}

.timeline-range-canvas__tooltip {
  position: absolute;
  z-index: 1;
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 112px;
  padding: 8px 10px;
  border: 1px solid rgba(197, 207, 236, 0.95);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 10px 24px rgba(97, 114, 162, 0.12);
  transform: translate(-50%, calc(-100% - 12px));
  pointer-events: none;
  white-space: nowrap;
}

.timeline-range-canvas__tooltip-line {
  color: #46557d;
  font-size: 12px;
  line-height: 1.35;
}
</style>
