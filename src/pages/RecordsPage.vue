<script setup lang="ts">
import { ref } from 'vue'
import { clearRecords, listRecords, removeRecord } from '../services/recordStore'
import { STATUS_LABEL } from '../types'

const records = ref(load())
const confirmClear = ref(false)

// 列表不需要事件內容，避免 Vue 深度代理大量資料
function load() {
  return listRecords().map(({ record: { id, startedAt, endedAt, status }, size }) => ({ id, startedAt, endedAt, status, size }))
}

function remove(id: string) {
  removeRecord(id)
  records.value = load()
}

function clear() {
  clearRecords()
  confirmClear.value = false
  records.value = load()
}

const time = (t: number) => new Date(t).toLocaleString('zh-TW', { hour12: false })
</script>

<template>
  <div class="head">
    <div>
      <h1>操作紀錄</h1>
      <p class="muted">存在這個瀏覽器的 localStorage，最多保留 20 筆。</p>
    </div>
    <div v-if="records.length" class="actions">
      <button v-if="!confirmClear" class="danger" @click="confirmClear = true">清空</button>
      <template v-else>
        <button class="danger" @click="clear">確定清空 {{ records.length }} 筆</button>
        <button @click="confirmClear = false">取消</button>
      </template>
    </div>
  </div>

  <div v-if="!records.length" class="card">還沒有紀錄。<RouterLink to="/">去填一次表單</RouterLink></div>
  <div v-else class="card table">
    <table>
      <thead>
        <tr><th>開始時間</th><th>狀態</th><th class="num">時長</th><th class="num">大小</th><th></th></tr>
      </thead>
      <tbody>
        <tr v-for="r in records" :key="r.id">
          <td>{{ time(r.startedAt) }}</td>
          <td><span class="tag" :class="r.status">{{ STATUS_LABEL[r.status] }}</span></td>
          <td class="num">{{ ((r.endedAt - r.startedAt) / 1000).toFixed(1) }} 秒</td>
          <td class="num">{{ (r.size / 1024).toFixed(1) }} KB</td>
          <td class="ops">
            <RouterLink :to="`/records/${r.id}`">重播</RouterLink>
            <button class="danger" @click="remove(r.id)">刪除</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.actions, .ops { display: flex; gap: 12px; align-items: center; justify-content: flex-end; }
.table { padding: 0; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 10px 16px; text-align: left; white-space: nowrap; border-bottom: 1px solid var(--line); }
tbody tr:last-child td { border-bottom: 0; }
.num { text-align: right; font-variant-numeric: tabular-nums; }
</style>
