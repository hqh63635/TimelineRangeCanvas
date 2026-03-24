import type { App } from 'vue'
import TimelineRangeCanvas from './components/TimelineRangeCanvas.vue'

export * from './types'
export { TimelineRangeCanvas }

export default {
  install(app: App) {
    app.component('TimelineRangeCanvas', TimelineRangeCanvas)
  },
}

