<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import backend from '../sdk/backend'
import Switch from './ui/Switch.vue'

const route = useRoute()
const checkValue = ref(false)
const showEditIcon = ref(true)
const editForm = ref({
    id: '',
    name: '',
})

onMounted(async () => {
    const resp = await backend.get('devices')
    console.log(resp)
})

const management = computed(() => route.path === '/setting/management')
const notify = computed(() => route.path.includes('/setting/notify'))
const about = computed(() => route.path.includes('/setting/about'))
</script>

<template>
  <div class="flex h-screen w-full max-w-5xl  flex-1 flex-col space-y-10 bg-slate-50 p-10">
    <div v-show="management">
      <div class="mx-auto max-w-md rounded-md bg-white px-6 py-8 shadow-md">
        <img src="https://tupian.qqw21.com/article/UploadPic/2021-4/2021422058717321.jpg" alt="">
        <div class="mt-4 flex items-center">
          <div class="relative flex flex-row items-center text-gray-500">
            name:
            <input
              ref="editInputRef"
              v-model="editForm.name"
              placeholder="Name click to edit"
              class="ml-1 block w-full cursor-pointer truncate rounded-md border
              border-transparent px-2 py-1.5 text-sm font-semibold text-gray-700
              placeholder:font-medium placeholder:text-gray-400 focus:cursor-context-menu
              focus:border-indigo-500 focus:bg-white
              focus:text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              @focus="showEditIcon = false"
              @blur="showEditIcon = true"
            >
            <template v-if="showEditIcon">
              <span class="absolute inset-y-0 hidden items-center group-hover:flex">
                <div
                  v-if="showEditIcon"
                  class="h-5 w-5 cursor-pointer font-semibold text-gray-700"
                  @click="$refs.editInputRef.focus()"
                />
              </span>
            </template>
          </div>
          <span v-if="editForm.id" class="ml-10 flex items-center space-x-3">
            <span class="text-gray-500"> id: </span>
            <span class="ml-1 text-sm font-medium text-gray-900">
              {{ editForm.id }}
            </span>
          </span>
        </div>
        <p class="mt-4 text-gray-600">
          id: <span class="ml-2 font-semibold text-gray-700">jsuiojismbdii</span>
        </p>
      </div>
      <div class="mt-10 flex w-full justify-center">
        <a href="/logout">
          <div class="rounded-md bg-primary-600 px-3 py-2 text-sm font-semibold text-white">Logout</div>
        </a>
      </div>
    </div>

    <div v-show="notify">
      您可以在这个地方设置通知，比如说……
      <div class="mt-6 flex space-x-4">
        <Switch :model-value="checkValue" @update:model-value="v => checkValue = v" />
        <p>关闭通知提示</p>
      </div>
    </div>

    <div v-show="about">
      关于我们，我们是一款非常智能的聊天网站，他可以……
    </div>
  </div>
</template>
