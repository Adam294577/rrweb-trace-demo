<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue'
import { sendMail } from '../api/sendMail'
import { submitForm, type MockResult } from '../api/submitForm'
import { useRecorder } from '../composables/useRecorder'
import type { MailPayload, SafeFormData } from '../types'
import { emptyForm, validate, type FormErrors } from '../utils/validate'

const { recording, saveFailed, start, submitStarted } = useRecorder()
const form = reactive(emptyForm())
const errors = ref<FormErrors>({})
const mockResult = ref<MockResult>('success')
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const message = ref('')
const mail = ref<MailPayload | null>(null)
const mailing = ref(false)
let submitted: { id: string; form: SafeFormData } | null = null
const locked = computed(() => state.value === 'submitting' || state.value === 'success')

async function onSubmit() {
  if (locked.value) return
  const { password: _, ...safe } = form
  const report = submitStarted(safe)
  errors.value = validate(form)
  if (Object.keys(errors.value).length) {
    state.value = 'error'
    message.value = '請修正標示的欄位後再送出'
    report.result({ status: 'invalid', message: Object.values(errors.value).join('、') })
    return
  }
  state.value = 'submitting'
  message.value = ''
  try {
    const { id } = await submitForm(mockResult.value)
    state.value = 'success'
    message.value = `送出成功，單號 ${id}`
    report.result({ status: 'success', message: message.value })
    submitted = { id, form: safe }
  } catch (e) {
    state.value = 'error'
    message.value = `送出失敗：${(e as Error).message}`
    report.result({ status: 'server-error', message: message.value })
    return
  }
  // 送單已成功，寄信結果不影響送單狀態
  await notify()
  if (mail.value) report.mail(mail.value)
}

async function notify() {
  if (!submitted || mailing.value) return
  mailing.value = true
  mail.value = null
  try {
    const status = await sendMail(submitted.id, submitted.form)
    mail.value = { status, message: status === 'sent' ? '通知信已寄出' : '通知信已模擬寄出（未設定 SMTP）' }
  } catch (e) {
    mail.value = { status: 'failed', message: `通知信寄送失敗：${(e as Error).message}` }
  } finally {
    mailing.value = false
  }
}

async function restart() {
  Object.assign(form, emptyForm())
  errors.value = {}
  mail.value = null
  submitted = null
  state.value = 'idle'
  message.value = ''
  await nextTick()
  start()
}
</script>

<template>
  <section class="form-page">
    <h1>填寫表單</h1>
    <p class="muted">此頁的操作會被錄製，密碼不會記錄。請勿輸入真實資料。
      <span class="tag" :class="{ invalid: recording }">{{ recording ? '● 錄製中' : '■ 已停止錄製' }}</span>
    </p>

    <form class="card" novalidate autocomplete="off" @submit.prevent="onSubmit">
      <fieldset :disabled="locked">
        <div class="mock">
          <span>模擬結果</span>
          <label><input v-model="mockResult" type="radio" name="mockResult" value="success" /> 成功</label>
          <label><input v-model="mockResult" type="radio" name="mockResult" value="error" /> 伺服器錯誤 500</label>
        </div>

        <label class="field">姓名
          <input v-model="form.name" name="name" maxlength="50" />
          <span v-show="errors.name" class="error">{{ errors.name }}</span>
        </label>
        <label class="field">Email
          <input v-model="form.email" name="email" type="email" maxlength="254" />
          <span v-show="errors.email" class="error">{{ errors.email }}</span>
        </label>
        <label class="field">手機
          <input v-model="form.phone" name="phone" type="tel" />
          <span v-show="errors.phone" class="error">{{ errors.phone }}</span>
        </label>
        <label class="field">密碼
          <input v-model="form.password" name="password" type="password" autocomplete="new-password" />
          <span v-show="errors.password" class="error">{{ errors.password }}</span>
        </label>
        <label class="field">類別
          <select v-model="form.category" name="category">
            <option value="">請選擇</option>
            <option>諮詢</option>
            <option>報修</option>
            <option>退換貨</option>
          </select>
          <span v-show="errors.category" class="error">{{ errors.category }}</span>
        </label>
        <label class="field">備註
          <textarea v-model="form.remark" name="remark" rows="3" maxlength="1000"></textarea>
        </label>
        <div class="field">
          <label><input v-model="form.agree" name="agree" type="checkbox" /> 我同意條款</label>
          <span v-show="errors.agree" class="error">{{ errors.agree }}</span>
        </div>

        <button class="primary" type="submit">{{ state === 'submitting' ? '送出中…' : '送出' }}</button>
      </fieldset>

      <div aria-live="polite">
        <div v-if="message" class="notice" :class="state === 'success' ? 'ok' : 'bad'">{{ message }}</div>
        <div v-if="mailing" class="notice">通知信寄送中…</div>
        <div v-if="mail" class="notice" :class="mail.status === 'failed' ? 'bad' : 'ok'">{{ mail.message }}</div>
      </div>
      <div v-if="saveFailed" class="notice bad">瀏覽器儲存空間不足，這次操作紀錄未能保存（不影響送出）。</div>
      <div v-if="state === 'success' && !mailing" class="after">
        <button v-if="mail?.status === 'failed'" type="button" @click="notify">重寄通知信</button>
        <button type="button" @click="restart">再填一筆</button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.form-page { max-width: 640px; margin: 0 auto; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.mock { display: flex; gap: 18px; flex-wrap: wrap; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--line); }
.field { display: block; margin-bottom: 14px; }
.field .error { display: block; }
.after { display: flex; gap: 12px; margin-top: 12px; }
</style>
