import type { SafeFormData } from '../types'

/** 比後端 SMTP 逾時（10 秒）長，讓後端先回明確錯誤 */
const TIMEOUT = 15_000

/** 請後端寄通知信；只挑需要的欄位，不含密碼 */
export async function sendMail(id: string, form: SafeFormData): Promise<'sent' | 'simulated'> {
  const { name, email, phone, category, remark } = form
  let res: Response
  try {
    res = await fetch('/api/mail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, name, email, phone, category, remark }),
      signal: AbortSignal.timeout(TIMEOUT),
    })
  } catch (e) {
    throw new Error((e as Error).name === 'TimeoutError' ? '寄信服務逾時' : '無法連線寄信服務')
  }
  // 後端沒開時 Vite proxy 回的不是 JSON
  const body = await res.json().catch(() => null)
  if (!res.ok) throw new Error(body?.message ?? '寄信服務未啟動或異常')
  if (body?.mode !== 'sent' && body?.mode !== 'simulated') throw new Error('寄信服務回應異常')
  return body.mode
}
