# vue-canvas-timeline-range

一个基于 Vue 3 和 Canvas 的时间轴区间选择器组件，适合做音频片段选择、历史时间范围筛选、趋势数据窗口裁切等场景。

## 功能

- `canvas` 绘制时间轴概览
- 拖动整个选区
- 拖动左右把手缩放区间
- 在空白区域重新框选时间范围
- 鼠标滚轮按光标位置缩放选区
- 支持自定义刻度文案和 tooltip 文案
- 支持自定义时间轴背景和滑块背景色
- 支持 `Date`、时间戳、ISO 字符串、`HH:mm:ss`、`HHmmss`
- 内置组件库构建、demo 构建、单元测试和发包校验

## 安装

```bash
npm install vue-canvas-timeline-range
```

## 使用

### 日期时间模式

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TimelineRangeCanvas } from 'vue-canvas-timeline-range'
import 'vue-canvas-timeline-range/style.css'

const range = ref<[Date, Date]>([
  new Date('1988-10-03T00:00:00Z'),
  new Date('1990-09-15T00:00:00Z'),
])
</script>

<template>
  <TimelineRangeCanvas
    v-model="range"
    :min="new Date('1988-01-01T00:00:00Z')"
    :max="new Date('1999-12-31T00:00:00Z')"
    background="#f7f9fc"
    selection-background="rgba(102, 122, 214, 0.18)"
  />
</template>
```

### HH:mm:ss 模式

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TimelineRangeCanvas } from 'vue-canvas-timeline-range'

const range = ref<[string, string]>(['00:10:00', '00:35:30'])

</script>

<template>
  <TimelineRangeCanvas
    v-model="range"
    min="00:00:00"
    max="01:00:00"
    background="#f5f7fb"
    :min-span="1000"
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
| `disabled` | `boolean` | `false` | 是否禁用交互 |
| `enableWheelZoom` | `boolean` | `true` | 是否启用滚轮缩放 |
| `wheelZoomStep` | `number` | `0.14` | 每次滚轮缩放的比例步进 |
| `background` | `string` | `#fdfefe` | 时间轴轨道背景色 |
| `selectionBackground` | `string` | `rgba(135, 149, 218, 0.14)` | 选中滑块的背景色 |
| `axisLabelFormatter` | `(context) => string` | 内置格式 | 自定义刻度文案 |
| `rangeLabelFormatter` | `(context) => string` | 内置格式 | 自定义左右选区标签文案 |
| `tooltipFormatter` | `(context) => string \| string[]` | 内置格式 | 自定义 tooltip 文案 |
| `tooltipDisabled` | `boolean` | `false` | 是否禁用 tooltip |

## 默认行为

- 默认 tooltip 只显示当前时间，不再显示波形强度
- 默认不再绘制波浪或折线
- 当传入 `HH:mm:ss` 或 `HHmmss` 时，组件会自动按时间字符串解析并回传 `HH:mm:ss`

## Events

| 事件 | 说明 |
| --- | --- |
| `update:modelValue` | 拖动和缩放过程中持续触发 |
| `change` | 结束拖动、结束框选或滚轮缩放后触发 |

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

### 发布到 npm

1. 确认代码已经推送到 GitHub 仓库 `https://github.com/hqh63635/TimelineRangeCanvas`
2. 注册并登录 npm
3. 首次发布前检查包名是否可用
4. 执行 `npm publish`

如果当前本机使用的是镜像源，可以直接执行：

```bash
npm publish --registry=https://registry.npmjs.org/
```

当前 `package.json` 已配置：

- `repository`
- `homepage`
- `bugs`
- `publishConfig.registry`

发布后 npm 页面会自动关联到 GitHub 仓库和 issue 地址。
