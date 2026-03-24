# vue-canvas-timeline-range

一个基于 Vue 3 和 Canvas 的时间轴区间选择器组件，适合做音频片段选择、历史时间范围筛选、趋势数据窗口裁切等场景。

## 功能

- `canvas` 绘制的时间轴概览
- 拖动整个选区
- 拖动左右把手缩放区间
- 在空白区域重新框选时间范围
- 鼠标滚轮按光标位置缩放选区
- 支持传入折线/波形概览数据
- 支持自定义轴刻度文案和 tooltip 文案
- 支持 `Date`、时间戳、ISO 字符串三种时间值
- 内置组件库构建、demo 构建、单元测试和发包校验

## 安装

```bash
npm install vue-canvas-timeline-range
```

## 使用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TimelineRangeCanvas } from 'vue-canvas-timeline-range'
import type {
  TimelineAxisLabelContext,
  TimelineTooltipContext,
} from 'vue-canvas-timeline-range'
import 'vue-canvas-timeline-range/style.css'

const range = ref<[Date, Date]>([
  new Date('1988-10-03T00:00:00Z'),
  new Date('1990-09-15T00:00:00Z'),
])

const series = [
  { time: new Date('1988-01-01T00:00:00Z'), value: 0.42 },
  { time: new Date('1990-01-01T00:00:00Z'), value: 0.65 },
  { time: new Date('1992-01-01T00:00:00Z'), value: 0.38 },
]

function axisLabelFormatter({ date }: TimelineAxisLabelContext) {
  return `${date.getUTCFullYear()}`
}

function tooltipFormatter({ date, nearestPoint }: TimelineTooltipContext) {
  const label = date.toISOString().slice(0, 10)

  if (!nearestPoint) {
    return [label]
  }

  return [label, `Value ${nearestPoint.value.toFixed(3)}`]
}
</script>

<template>
  <TimelineRangeCanvas
    v-model="range"
    :min="new Date('1988-01-01T00:00:00Z')"
    :max="new Date('1999-12-31T00:00:00Z')"
    :series="series"
    :height="110"
    :axis-label-formatter="axisLabelFormatter"
    :tooltip-formatter="tooltipFormatter"
  />
</template>
```

## Props

| 名称 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `[string \| number \| Date, string \| number \| Date]` | 整个区间 | 当前选中的时间范围 |
| `min` | `string \| number \| Date` | 必填 | 时间轴最小值 |
| `max` | `string \| number \| Date` | 必填 | 时间轴最大值 |
| `minSpan` | `number` | `86400000` | 允许选择的最小跨度，单位毫秒 |
| `height` | `number` | `96` | 组件高度 |
| `axisTickCount` | `number` | `5` | 顶部刻度数量 |
| `handleWidth` | `number` | `8` | 左右把手宽度 |
| `series` | `{ time, value }[]` | `[]` | 用于绘制概览折线的数据 |
| `disabled` | `boolean` | `false` | 是否禁用交互 |
| `enableWheelZoom` | `boolean` | `true` | 是否启用滚轮缩放 |
| `wheelZoomStep` | `number` | `0.14` | 每次滚轮缩放的比例步进 |
| `axisLabelFormatter` | `(context) => string` | 内置格式 | 自定义刻度文案 |
| `rangeLabelFormatter` | `(context) => string` | 内置格式 | 自定义左右选区标签文案 |
| `tooltipFormatter` | `(context) => string \| string[]` | 内置格式 | 自定义悬浮 tooltip 文案 |
| `tooltipDisabled` | `boolean` | `false` | 是否禁用 tooltip |

## Events

| 事件 | 说明 |
| --- | --- |
| `update:modelValue` | 拖动和缩放过程中持续触发 |
| `change` | 结束拖动、结束框选或滚轮缩放后触发 |

## 导出类型

- `TimelineSeriesPoint`
- `TimelineAxisLabelContext`
- `TimelineRangeLabelContext`
- `TimelineTooltipContext`
- `TimelineAxisLabelFormatter`
- `TimelineRangeLabelFormatter`
- `TimelineTooltipFormatter`

## 开发

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
npm run pack:check
```

## 发布

```bash
npm publish
```

包内已配置 `prepublishOnly`，发布前会自动执行类型检查、测试、构建和 `npm pack --dry-run`。

## 当前目录

- 组件入口：`src/index.ts`
- 核心组件：`src/components/TimelineRangeCanvas.vue`
- 时间工具：`src/utils/timeline.ts`
- 本地示例：`src/App.vue`
- 单元测试：`test/`
