export interface FormData {
  name: string
  email: string
  phone: string
  password: string
  category: string
  remark: string
  agree: boolean
}

export type FormErrors = Partial<Record<keyof FormData, string>>

export const emptyForm = (): FormData => ({
  name: '', email: '', phone: '', password: '', category: '', remark: '', agree: false,
})

/** 訊息不可包含使用者輸入值，避免密碼經由畫面或事件外洩 */
export function validate(form: FormData): FormErrors {
  const errors: FormErrors = {}
  if (!form.name.trim()) errors.name = '請輸入姓名'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Email 格式錯誤'
  if (!/^09\d{8}$/.test(form.phone)) errors.phone = '手機須為 09 開頭共 10 碼'
  if (form.password.length < 8) errors.password = '密碼至少 8 碼'
  if (!form.category) errors.category = '請選擇類別'
  if (!form.agree) errors.agree = '請勾選同意條款'
  return errors
}
