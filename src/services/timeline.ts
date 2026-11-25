import { EventType, IncrementalSource, NodeType, type eventWithTime, type serializedNodeWithId } from '@rrweb/types'
import { FIELD_LABEL, type ResultPayload } from '../types'

export interface TimelineItem {
  /** 距錄製開始的毫秒數；合併的輸入取最後一次，跳轉後可看到完整內容 */
  offset: number
  kind: 'input' | 'submit' | 'success' | 'fail'
  text: string
}

interface Field {
  name: string
  type: string
}

function collectFields(node: serializedNodeWithId, map: Map<number, Field>) {
  if (node.type === NodeType.Element) {
    const { name, type } = node.attributes
    if (typeof name === 'string' && ['input', 'select', 'textarea'].includes(node.tagName))
      map.set(node.id, { name, type: typeof type === 'string' ? type : node.tagName })
  }
  if ('childNodes' in node) node.childNodes.forEach((c) => collectFields(c, map))
}

function describe(field: Field, text: string, checked: boolean): string {
  const label = FIELD_LABEL[field.name] ?? field.name
  if (field.type === 'checkbox') return `${checked ? '勾選' : '取消勾選'} ${label}`
  if (field.name === 'mockResult') return `選擇 ${label} → ${text === 'error' ? '伺服器錯誤 500' : '成功'}`
  if (!text) return `清空 ${label}`
  return `${field.type === 'select' ? '選擇' : '輸入'} ${label} → ${text}`
}

/** 純粹由 rrweb 事件推導，不依賴額外監聽 */
export function buildTimeline(events: eventWithTime[]): TimelineItem[] {
  const start = events[0]?.timestamp ?? 0
  const fields = new Map<number, Field>()
  const items: TimelineItem[] = []
  let lastInputId: number | null = null

  for (const e of events) {
    const offset = e.timestamp - start
    if (e.type === EventType.FullSnapshot) {
      collectFields(e.data.node, fields)
    } else if (e.type === EventType.IncrementalSnapshot && e.data.source === IncrementalSource.Mutation) {
      e.data.adds.forEach((a) => collectFields(a.node, fields))
    } else if (e.type === EventType.IncrementalSnapshot && e.data.source === IncrementalSource.Input) {
      const field = fields.get(e.data.id)
      if (!field || !e.data.userTriggered) continue
      const item: TimelineItem = { offset, kind: 'input', text: describe(field, e.data.text, e.data.isChecked) }
      // 勾選不合併，反覆勾選本身就是線索
      if (lastInputId === e.data.id && field.type !== 'checkbox') items[items.length - 1] = item
      else items.push(item)
      lastInputId = e.data.id
    } else if (e.type === EventType.Custom) {
      lastInputId = null
      if (e.data.tag === 'submit') items.push({ offset, kind: 'submit', text: '按下送出' })
      if (e.data.tag === 'result') {
        const { status, message } = e.data.payload as ResultPayload
        const prefix = status === 'invalid' ? '驗證失敗：' : ''
        items.push({ offset, kind: status === 'success' ? 'success' : 'fail', text: prefix + message })
      }
    }
  }
  return items
}
