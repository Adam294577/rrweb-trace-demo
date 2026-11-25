import { describe, expect, it } from 'vitest'
import { emptyForm, validate } from '../src/utils/validate'

const valid = { name: '王小明', email: 'a@b.co', phone: '0912345678', password: '12345678', category: '諮詢', remark: '', agree: true }

describe('validate', () => {
  it('正確資料沒有錯誤', () => expect(validate(valid)).toEqual({}))
  it('空白表單列出所有必填', () =>
    expect(Object.keys(validate(emptyForm())).sort()).toEqual(['agree', 'category', 'email', 'name', 'password', 'phone']))
  it.each([['email', 'adam@'], ['phone', '091234567'], ['password', '1234567'], ['name', '  ']])('%s 不合法', (k, v) =>
    expect(Object.keys(validate({ ...valid, [k]: v }))).toEqual([k]))
  it('錯誤訊息不含密碼', () =>
    expect(JSON.stringify(validate({ ...valid, password: 'zq9!' }))).not.toContain('zq9!'))
})
