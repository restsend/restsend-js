<script setup>
import { onMounted, ref } from 'vue'
import { ChevronLeftIcon } from '@heroicons/vue/24/solid'
import { logger } from './sdk/utils'

import { useAppStore } from '@/store'
import client from '@/sdk/client'
import NavBar from '@/components/layout/NavBar.vue'

const store = useAppStore()

const homeInfo = ref({
  list: [],
})

const appStore = useAppStore()

async function startConnect() {
  try {
    const info = await client.loginWithToken(appStore.authUserId, appStore.authToken)
    appStore.signin(info, true)
    logger.info('Login with token success', appStore.authUserId)
  }
  catch (e) {
    logger.error('Login with token failed', e)
    appStore.logout()
    return
  }

  client.onAuthError = () => {
    logger.error('Auth error')
  }
  client.onConnected = () => {
    logger.info('Connected')
  }
  client.onDisconnected = (reason) => {
    logger.warn('Disconnected', reason)
  }
  client.onNetBroken = () => {
    logger.warn('Netbroken')
  }
  await client.connect()
}

async function handleListApply() {
  const obj = await client.getKnocks() || []
  homeInfo.value.list = obj
  store.setApplicationList(homeInfo.value.list)
  console.log(appStore.applicationList)
}
onMounted(() => {
  startConnect().then(() => { })
  setInterval(() => {
    handleListApply()
  }, 10000000)
})
</script>

<template>
  <div>
    <Suspense>
      <template #default>
        <router-view v-if="appStore.authenticated" v-slot="{ Component }">
          <div>
            <NavBar />
            <div class="h-screen w-full lg:flex lg:pl-20">
              <div class="hidden lg:block">
                <component :is="Component" />
              </div>
              <aside
                class="inset-y-0 right-0 h-screen w-full overflow-y-auto border-l border-gray-200 bg-gray-50 px-4 sm:px-6 lg:ml-72 lg:px-8">
                <ChevronLeftIcon class="fixed z-30 mt-3 h-6 w-6 lg:hidden" @click="appStore.setSideBar(true)" />
                <router-view v-slot="{ Component }">
                  <component :is="Component" />
                </router-view>
              </aside>
            </div>
          </div>
        </router-view>
        <div v-else class="flex items-center justify-center pt-8">
          <div class="sm:ml-6">
            <div class="text-center sm:border-l sm:border-gray-200 sm:pl-6">
              <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                You are not login yet!
              </h1>
            </div>
            <div
              class="mt-6 space-x-3 space-y-6 rounded-md pb-6 pt-3 text-center sm:border-l sm:border-transparent sm:pl-6">
              <p class="mt-4 text-base text-gray-500">
                Log in or create an account to access this page
              </p>
              <router-link to="/signin"
                class="inline-flex items-center rounded-md border border-transparent
                                                          bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm
                                                          hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Sign In
              </router-link>
            </div>
          </div>
        </div>
      </template>
      <template #fallback>
        Get Auth info fail, refresh now
      </template>
    </Suspense>
  </div>
</template>
