import { createRouter, createWebHistory } from 'vue-router'
import FormPage from './pages/FormPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: FormPage },
    { path: '/records', component: () => import('./pages/RecordsPage.vue') },
    { path: '/records/:id', component: () => import('./pages/ReplayPage.vue'), props: true },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
})
