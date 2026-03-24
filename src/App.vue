<script setup lang="ts">
import { computed, ref } from 'vue'
import { TimelineRangeCanvas } from './index'
import type { TimelineAxisLabelContext, TimelineSeriesPoint, TimelineTooltipContext } from './types'

const min = new Date('1988-01-01T00:00:00Z')
const max = new Date('1999-12-31T00:00:00Z')
const range = ref<[Date, Date]>([
  new Date('1988-10-03T00:00:00Z'),
  new Date('1990-09-15T00:00:00Z'),
])

const series = computed<TimelineSeriesPoint[]>(() => {
  const start = min.getTime()
  const end = max.getTime()
  const total = 220
  const points: TimelineSeriesPoint[] = []

  for (let index = 0; index <= total; index += 1) {
    const ratio = index / total
    const time = start + (end - start) * ratio
    const wave =
      0.54 +
      Math.sin(index * 0.17) * 0.11 +
      Math.cos(index * 0.09) * 0.08 +
      Math.sin(index * 0.61) * 0.03

    points.push({
      time,
      value: Number(wave.toFixed(3)),
    })
  }

  return points
})

function axisLabelFormatter({ date }: TimelineAxisLabelContext) {
  return `${date.getUTCFullYear()}`
}

function tooltipFormatter({ date }: TimelineTooltipContext) {
  return [date.toISOString().slice(0, 10)]
}
</script>

<template>
  <main class="demo-shell">
    <section class="demo-card">
      <div class="demo-copy">
        <span class="demo-kicker">Vue Canvas Timeline</span>
        <h1>时间轴区间选择器</h1>
        <p>
          用一块响应式 canvas 实现拖拽、缩放和重新框选时间区间，适合音频片段、事件范围和历史走势选择场景。
        </p>
        <p class="demo-note">拖动把手调整范围，直接拖整段移动，鼠标滚轮缩放选区。</p>
      </div>

      <TimelineRangeCanvas
        v-model="range"
        :min="min"
        :max="max"
        :series="series"
        :height="110"
        :axis-label-formatter="axisLabelFormatter"
        :tooltip-formatter="tooltipFormatter"
        selection-background="rgba(102, 122, 214, 0.18)"
      />

      <div class="demo-values">
        <div>
          <span>开始</span>
          <strong>{{ range[0].toISOString().slice(0, 10) }}</strong>
        </div>
        <div>
          <span>结束</span>
          <strong>{{ range[1].toISOString().slice(0, 10) }}</strong>
        </div>
      </div>
    </section>
  </main>
</template>
