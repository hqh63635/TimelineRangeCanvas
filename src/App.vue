<script setup lang="ts">
import { ref } from 'vue'
import { TimelineRangeCanvas } from './index'
import type {
  TimelineAxisLabelContext,
  TimelineRangeLabelContext,
  TimelineTooltipContext,
} from './types'

const basicMin = new Date('2024-01-01T00:00:00')
const basicMax = new Date('2024-06-30T23:59:59')
const basicRange = ref<[Date, Date]>([
  new Date('2024-02-10T00:00:00'),
  new Date('2024-04-18T00:00:00'),
])

const dateMin = new Date('2024-05-01T00:00:00')
const dateMax = new Date('2024-05-31T23:59:59')
const dateRange = ref<[Date, Date]>([
  new Date('2024-05-03T00:00:00'),
  new Date('2024-05-17T00:00:00'),
])

const timeMin = '000000'
const timeMax = '020000'
const timeRange = ref<[string, string]>(['001220', '010435'])

const dateTimeMin = new Date('2024-05-20T08:00:00')
const dateTimeMax = new Date('2024-05-20T20:00:00')
const dateTimeRange = ref<[Date, Date]>([
  new Date('2024-05-20T09:15:20'),
  new Date('2024-05-20T14:48:35'),
])

const fullMin = new Date('2024-06-01T00:00:00')
const fullMax = new Date('2024-06-03T23:59:59')
const fullRange = ref<[Date, Date]>([
  new Date('2024-06-01T10:30:00'),
  new Date('2024-06-02T18:15:30'),
])

function pad2(value: number) {
  return String(value).padStart(2, '0')
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function formatTime(date: Date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`
}

function formatDateTime(date: Date) {
  return `${formatDate(date)} ${formatTime(date)}`
}

function formatCompactTime(timestamp: number) {
  const totalSeconds = Math.max(0, Math.floor(timestamp / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${pad2(hours)}${pad2(minutes)}${pad2(seconds)}`
}

function compactDisplay(value: string) {
  return value.replace(/:/g, '')
}

function formatDuration(timestamp: number) {
  const totalSeconds = Math.max(0, Math.floor(timestamp / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`
}

function dateAxisLabelFormatter({ date }: TimelineAxisLabelContext) {
  return formatDate(date)
}

function dateRangeLabelFormatter({ date }: TimelineRangeLabelContext) {
  return formatDate(date)
}

function dateTooltipFormatter({ date }: TimelineTooltipContext) {
  return [formatDate(date)]
}

function compactTimeAxisLabelFormatter({ timestamp }: TimelineAxisLabelContext) {
  return formatCompactTime(timestamp)
}

function compactTimeRangeLabelFormatter({ timestamp }: TimelineRangeLabelContext) {
  return formatCompactTime(timestamp)
}

function compactTimeTooltipFormatter({ time }: TimelineTooltipContext) {
  return [formatCompactTime(time)]
}

function dateTimeAxisLabelFormatter({ date }: TimelineAxisLabelContext) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatTime(date)}`
}

function dateTimeRangeLabelFormatter({ date }: TimelineRangeLabelContext) {
  return formatDateTime(date)
}

function dateTimeTooltipFormatter({ date }: TimelineTooltipContext) {
  return [formatDateTime(date)]
}

function fullAxisLabelFormatter({ date }: TimelineAxisLabelContext) {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function fullRangeLabelFormatter({ date }: TimelineRangeLabelContext) {
  return `${formatDate(date)} ${formatTime(date)}`
}

function fullTooltipFormatter({ time, selection }: TimelineTooltipContext) {
  const start = new Date(selection.start)
  const end = new Date(selection.end)

  return [
    formatDateTime(new Date(time)),
    `范围 ${formatDateTime(start)} ~ ${formatDateTime(end)}`,
    `时长 ${formatDuration(selection.end - selection.start)}`,
  ]
}
</script>

<template>
  <main class="demo-shell">
    <section class="demo-card">
      <div class="demo-copy">
        <span class="demo-kicker">Vue Canvas Timeline</span>
        <h1>时间轴区间选择器示例集</h1>
        <p>同一页展示基础用法、年月日、时分秒、年月日时分秒，以及带背景替换与自定义 tooltip 的完整配置。</p>
      </div>

      <div class="demo-grid">
        <article class="demo-example">
          <div class="demo-head">
            <div>
              <span class="demo-index">01</span>
              <h2>基础示例</h2>
            </div>
            <p>直接使用默认格式，适合先接入再逐步定制。</p>
          </div>

          <TimelineRangeCanvas
            v-model="basicRange"
            :min="basicMin"
            :max="basicMax"
            :height="110"
          />

          <div class="demo-values">
            <div>
              <span>开始</span>
              <strong>{{ formatDate(basicRange[0]) }}</strong>
            </div>
            <div>
              <span>结束</span>
              <strong>{{ formatDate(basicRange[1]) }}</strong>
            </div>
          </div>
        </article>

        <article class="demo-example">
          <div class="demo-head">
            <div>
              <span class="demo-index">02</span>
              <h2>年月日</h2>
            </div>
            <p>刻度、滑块标签和 tooltip 全部按 `YYYY-MM-DD` 展示。</p>
          </div>

          <TimelineRangeCanvas
            v-model="dateRange"
            :min="dateMin"
            :max="dateMax"
            :height="110"
            :axis-label-formatter="dateAxisLabelFormatter"
            :range-label-formatter="dateRangeLabelFormatter"
            :tooltip-formatter="dateTooltipFormatter"
          />

          <div class="demo-values">
            <div>
              <span>开始</span>
              <strong>{{ formatDate(dateRange[0]) }}</strong>
            </div>
            <div>
              <span>结束</span>
              <strong>{{ formatDate(dateRange[1]) }}</strong>
            </div>
          </div>
        </article>

        <article class="demo-example">
          <div class="demo-head">
            <div>
              <span class="demo-index">03</span>
              <h2>时分秒</h2>
            </div>
            <p>用 `HHmmss` 输入和展示紧凑时间格式，适合音视频片段选择。</p>
          </div>

          <TimelineRangeCanvas
            v-model="timeRange"
            :min="timeMin"
            :max="timeMax"
            :min-span="1000"
            :height="110"
            :axis-label-formatter="compactTimeAxisLabelFormatter"
            :range-label-formatter="compactTimeRangeLabelFormatter"
            :tooltip-formatter="compactTimeTooltipFormatter"
            background="#f8fafc"
            selection-background="rgba(70, 132, 214, 0.18)"
          />

          <div class="demo-values">
            <div>
              <span>开始 HHmmss</span>
              <strong>{{ compactDisplay(timeRange[0]) }}</strong>
            </div>
            <div>
              <span>结束 HHmmss</span>
              <strong>{{ compactDisplay(timeRange[1]) }}</strong>
            </div>
          </div>
        </article>

        <article class="demo-example">
          <div class="demo-head">
            <div>
              <span class="demo-index">04</span>
              <h2>年月日时分秒</h2>
            </div>
            <p>适合事件精确到秒的排期、记录回放和日志片段选择。</p>
          </div>

          <TimelineRangeCanvas
            v-model="dateTimeRange"
            :min="dateTimeMin"
            :max="dateTimeMax"
            :height="118"
            :axis-label-formatter="dateTimeAxisLabelFormatter"
            :range-label-formatter="dateTimeRangeLabelFormatter"
            :tooltip-formatter="dateTimeTooltipFormatter"
            background="#f8fbfd"
            selection-background="rgba(91, 163, 164, 0.2)"
          />

          <div class="demo-values">
            <div>
              <span>开始</span>
              <strong>{{ formatDateTime(dateTimeRange[0]) }}</strong>
            </div>
            <div>
              <span>结束</span>
              <strong>{{ formatDateTime(dateTimeRange[1]) }}</strong>
            </div>
          </div>
        </article>

        <article class="demo-example demo-example--full">
          <div class="demo-head">
            <div>
              <span class="demo-index">05</span>
              <h2>完整配置</h2>
            </div>
            <p>演示背景替换、自定义选区背景、自定义刻度、tooltip 和更长时间范围。</p>
          </div>

          <TimelineRangeCanvas
            v-model="fullRange"
            :min="fullMin"
            :max="fullMax"
            :height="122"
            :axis-tick-count="6"
            :handle-width="10"
            :axis-label-formatter="fullAxisLabelFormatter"
            :range-label-formatter="fullRangeLabelFormatter"
            :tooltip-formatter="fullTooltipFormatter"
            background="#f6f3ea"
            selection-background="rgba(199, 132, 62, 0.22)"
          />

          <div class="demo-values demo-values--wide">
            <div>
              <span>开始</span>
              <strong>{{ formatDateTime(fullRange[0]) }}</strong>
            </div>
            <div>
              <span>结束</span>
              <strong>{{ formatDateTime(fullRange[1]) }}</strong>
            </div>
            <div>
              <span>当前时长</span>
              <strong>{{ formatDuration(fullRange[1].getTime() - fullRange[0].getTime()) }}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  </main>
</template>
