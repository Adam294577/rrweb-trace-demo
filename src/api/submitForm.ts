export type MockResult = 'success' | 'error'

/** 模擬後端：約 800ms 後成功或回 500。不會送出任何真實請求，也不保存表單資料 */
export function submitForm(result: MockResult): Promise<{ id: string }> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (result === 'error') reject(new Error('伺服器錯誤（500）'))
      else resolve({ id: `F${Date.now()}` })
    }, 800),
  )
}
