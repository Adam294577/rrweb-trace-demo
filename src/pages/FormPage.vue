<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { submitForm, type MockResult } from '../api/submitForm'
import { emptyForm, validate, type FormErrors } from '../utils/validate'

const form = reactive(emptyForm())
const errors = ref<FormErrors>({})
const mockResult = ref<MockResult>('success')
const state = ref<'idle' | 'submitting' | 'success' | 'error'>('idle')
const message = ref('')
const locked = computed(() => state.value === 'submitting' || state.value === 'success')

async function onSubmit() {
  if (locked.value) return
  errors.value = validate(form)
  if (Object.keys(errors.value).length) {
    state.value = 'error'
    message.value = '請修正標示的欄位後再送出'
    return
  }
  state.value = 'submitting'
  message.value = ''
  try {
    const { id } = await submitForm(mockResult.value)
    state.value = 'success'
    message.value = `送出成功，單號 ${id}`
  } catch (e) {
    state.value = 'error'
    message.value = `送出失敗：${(e as Error).message}`
  }
}

function restart() {
  Object.assign(form, emptyForm())
  errors.value = {}
  state.value = 'idle'
  message.value = ''
}
</script>

<template>
  <section class="form-page">
    <h1>填寫表單</h1>
    <p class="muted">此頁的操作會被錄製，密碼不會記錄。請勿輸入真實資料。</p>

    <form class="card" novalidate autocomplete="off" @submit.prevent="onSubmit">
      <fieldset :disabled="locked">
        <div class="mock">
          <span>模擬結果</span>
          <label><input v-model="mockResult" type="radio" name="mockResult" value="success" /> 成功</label>
          <label><input v-model="mockResult" type="radio" name="mockResult" value="error" /> 伺服器錯誤 500</label>
        </div>

        <label class="field">姓名
          <input v-model="form.name" name="name" />
          <span v-show="errors.name" class="error">{{ errors.name }}</span>
        </label>
        <label class="field">Email
          <input v-model="form.email" name="email" type="email" />
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
          <textarea v-model="form.remark" name="remark" rows="3"></textarea>
        </label>
        <div class="field">
          <label><input v-model="form.agree" name="agree" type="checkbox" /> 我同意條款</label>
          <span v-show="errors.agree" class="error">{{ errors.agree }}</span>
        </div>

        <button class="primary" type="submit">{{ state === 'submitting' ? '送出中…' : '送出' }}</button>
      </fieldset>

      <div aria-live="polite">
        <div v-if="message" class="notice" :class="state === 'success' ? 'ok' : 'bad'">{{ message }}</div>
      </div>
      <button v-if="state === 'success'" class="again" type="button" @click="restart">再填一筆</button>
    </form>
  </section>
</template>

<style scoped>
.form-page { max-width: 640px; margin: 0 auto; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
.mock { display: flex; gap: 18px; flex-wrap: wrap; padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px solid var(--line); }
.field { display: block; margin-bottom: 14px; }
.field .error { display: block; }
.again { margin-top: 12px; }
</style>
