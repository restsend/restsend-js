import './style.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

import relativeTime from 'dayjs/plugin/relativeTime'
import dayjs from 'dayjs'
dayjs.extend(relativeTime)

createApp(App).use(router).use(store).mount('#app')
