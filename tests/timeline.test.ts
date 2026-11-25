import type { eventWithTime } from '@rrweb/types'
import { describe, expect, it } from 'vitest'
import { buildTimeline } from '../src/services/timeline'

const el = (id: number, tagName: string, name: string, type?: string) => ({
  type: 2, id, tagName, attributes: type ? { name, type } : { name }, childNodes: [],
})
const snapshot = {
  type: 2, timestamp: 1000,
  data: {
    node: {
      type: 0, id: 1,
      childNodes: [el(2, 'input', 'name'), el(3, 'input', 'email', 'email'), el(4, 'input', 'agree', 'checkbox'), el(5, 'select', 'category')],
    },
  },
}
const input = (t: number, id: number, text: string, isChecked = false, userTriggered = true) => ({
  type: 3, timestamp: 1000 + t, data: { source: 5, id, text, isChecked, userTriggered },
})
const custom = (t: number, tag: string, payload: object = {}) => ({ type: 5, timestamp: 1000 + t, data: { tag, payload } })
const build = (...events: unknown[]) => buildTimeline([snapshot, ...events] as eventWithTime[])
const texts = (...events: unknown[]) => build(...events).map((i) => i.text)

describe('buildTimeline', () => {
  it('空事件', () => expect(buildTimeline([])).toEqual([]))

  it('合併同欄連續輸入並取最後時間', () =>
    expect(build(input(10, 2, 'ㄨ'), input(20, 2, '王'))).toEqual([{ offset: 20, kind: 'input', text: '輸入 姓名 → 王' }]))

  it('換欄或送出後不合併', () =>
    expect(texts(input(1, 2, 'a'), input(2, 3, 'b'), input(3, 2, 'ab'), custom(4, 'submit'), input(5, 2, ''))).toEqual([
      '輸入 姓名 → a', '輸入 Email → b', '輸入 姓名 → ab', '按下送出', '清空 姓名',
    ]))

  it('勾選與下拉', () =>
    expect(texts(input(1, 4, 'on', true), input(2, 4, 'on', false), input(3, 5, '報修'))).toEqual([
      '勾選 同意條款', '取消勾選 同意條款', '選擇 類別 → 報修',
    ]))

  it('忽略程式改值與未知節點', () => expect(build(input(1, 2, 'x', false, false), input(2, 99, 'y'))).toEqual([]))

  it('支援錄製後才加入的欄位', () =>
    expect(texts({ type: 3, timestamp: 1001, data: { source: 0, adds: [{ node: el(9, 'textarea', 'remark') }] } }, input(2, 9, 'hi'))).toEqual([
      '輸入 備註 → hi',
    ]))

  it('結果', () =>
    expect(build(custom(1, 'result', { status: 'invalid', message: 'Email 格式錯誤' }), custom(2, 'result', { status: 'success', message: '送出成功' }))).toEqual([
      { offset: 1, kind: 'fail', text: '驗證失敗：Email 格式錯誤' },
      { offset: 2, kind: 'success', text: '送出成功' },
    ]))
})
