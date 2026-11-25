<script setup lang="ts">
import { computed, ref } from 'vue'
import ReplayPlayer from '../components/ReplayPlayer.vue'
import { getRecord } from '../services/recordStore'
import { buildTimeline, type TimelineItem } from '../services/timeline'
import { STATUS_LABEL } from '../types'

const props = defineProps<{ id: string }>()
const record = getRecord(props.id)
const playable = !!record && record.events.length >= 2

const timeline = ref<TimelineItem[]>([])
const damaged = ref(false)
if (record && playable) {
  try {
    timeline.value = buildTimeline(record.events)
  } catch (e) {
    console.error(e)
    damaged.value = true
  }
}

const player = ref<InstanceType<typeof ReplayPlayer>>()
const now = ref(0)
const current = computed(() => timeline.value.findLastIndex((i) => i.offset <= now.value))

const MARK = { input: '✎', submit: '→', success: '✓', fail: '✗' }
const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`
}
</script>

<template>
  <p><RouterLink to="/records">← 操作紀錄</RouterLink></p>
  <div v-if="!record" class="notice bad">找不到這筆紀錄，可能已刪除或資料損毀。</div>
  <template v-else>
    <h1>操作重播 <span class="tag" :class="record.status">{{ STATUS_LABEL[record.status] }}</span></h1>
    <p class="muted">{{ new Date(record.startedAt).toLocaleString('zh-TW', { hour12: false }) }}</p>
    <div v-if="record.truncated" class="notice bad">錄製達 5 分鐘上限，之後的操作沒有畫面。</div>
    <div v-if="!playable || damaged" class="notice bad">這筆紀錄的內容不足或損毀，無法重播。</div>

    <div v-else class="layout">
      <ReplayPlayer ref="player" :events="record.events" @time="now = $event" />
      <aside class="card">
        <h2>操作時間軸</h2>
        <p v-if="!timeline.length" class="muted">沒有輸入或送出。</p>
        <ol>
          <li v-for="(item, i) in timeline" :key="i">
            <button :class="[item.kind, { current: i === current }]" @click="player?.goto(item.offset)">
              <time>{{ clock(item.offset) }}</time>
              <span>{{ MARK[item.kind] }} {{ item.text }}</span>
            </button>
          </li>
        </ol>
        <details v-if="record.submission">
          <summary>最後一次送出的內容（不含密碼）</summary>
          <pre>{{ JSON.stringify(record.submission, null, 2) }}</pre>
        </details>
      </aside>
    </div>
  </template>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; margin-top: 16px; }
@media (max-width: 960px) { .layout { grid-template-columns: minmax(0, 1fr); } }
h2 { font-size: 18px; margin: 0 0 8px; }
ol { list-style: none; margin: 0; padding: 0; }
li button { display: flex; gap: 12px; width: 100%; border: 0; padding: 7px 8px; text-align: left; background: none; overflow-wrap: anywhere; }
li button:hover, li button.current { background: #e8effa; }
li time { color: var(--muted); font-variant-numeric: tabular-nums; }
li .submit span { color: var(--accent); font-weight: 600; }
li .success span { color: var(--ok); font-weight: 600; }
li .fail span { color: var(--bad); font-weight: 600; }
details { margin-top: 14px; border-top: 1px solid var(--line); padding-top: 12px; }
pre { font-size: 13px; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>
