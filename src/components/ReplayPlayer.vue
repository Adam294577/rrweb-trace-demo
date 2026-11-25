<script setup lang="ts">
import type { eventWithTime } from '@rrweb/types'
import Player from 'rrweb-player'
import 'rrweb-player/dist/style.css'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{ events: eventWithTime[] }>()
const emit = defineEmits<{ time: [offset: number] }>()

const host = ref<HTMLElement>()
const failed = ref(false)
let player: Player | null = null

onMounted(() => {
  const width = host.value!.clientWidth
  try {
    player = new Player({
      target: host.value!,
      props: {
        events: props.events,
        width,
        height: Math.round(width * 0.62),
        autoPlay: false,
        skipInactive: true,
        tags: { submit: '#1c5fc4', result: '#b3261e' },
      },
    })
    player.addEventListener('ui-update-current-time', (e) => emit('time', (e as { payload: number }).payload))
  } catch (e) {
    console.error(e)
    failed.value = true
  }
})

onBeforeUnmount(() => {
  player?.pause()
  // rrweb-player 執行時是 Svelte 元件，但套件沒帶 svelte 型別
  ;(player as unknown as { $destroy(): void } | null)?.$destroy()
  player = null
})

// rrweb 的 goto 不套用剛好落在該時間點的事件，往後 50ms 才看得到該步驟的結果
defineExpose({ goto: (offset: number) => player?.goto(offset + 50, false) })
</script>

<template>
  <div v-if="failed" class="notice bad">這筆紀錄的內容損毀，無法重播。</div>
  <div v-else ref="host" class="host"></div>
</template>

<style scoped>
.host { width: 100%; min-width: 0; }
.host :deep(.rr-player) { box-shadow: none; border: 1px solid var(--line); max-width: 100%; }
</style>
