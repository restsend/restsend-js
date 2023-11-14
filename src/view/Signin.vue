<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { useAppStore } from '@/store'
import client from '@/sdk/client'

const router = useRouter()
const appStore = useAppStore()

const authInfo = ref({
  email: '',
  password: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
})

const error = ref('')
const loading = ref(false)

onMounted(() => {
  authInfo.value.email = appStore.authUserId // 从 store 中读取上次登录的 email
})

async function doSignin(e) {
  e.preventDefault()

  try {
    loading.value = true
    const userInfo = await client.login(authInfo.value.email, authInfo.value.password)
    appStore.signin(userInfo, true)

    router.push('/')
  }
  catch (e) {
    console.error(e)
    error.value = 'unauthorized: ' + e.toString()
    return
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-full flex-col justify-center px-8 py-20 sm:px-6 sm:py-4">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <img class="mx-auto h-12 w-auto" src="../assets/logo.svg" alt="Restsend">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
        Sign in to your account
      </h2>
      <div class="mt-2 text-center text-sm text-gray-600">
        Or
        {{ ' ' }}
        <div class="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500" @click="$router.push('/signup')">
          start your
          14-day free trial
        </div>
      </div>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md" method="POST" @submit="doSignin">
      <div class="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" action="#" method="POST">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <div class="mt-1">
              <input id="email" v-model="authInfo.email" name="email" autocomplete="email"
                class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required :style="{ borderColor: error ? 'red' : '' }" @click="error = ''">
              <p v-if="error" class="mt-2 text-sm text-red-600">
                {{ error }}
              </p>
            </div>
          </div>

          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="mt-1">
              <input id="password" v-model="authInfo.password" name="password" type="password"
                autocomplete="current-password"
                class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                required>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="text-sm">
              <span class="cursor-pointer font-medium text-indigo-600 hover:text-indigo-500"
                @click="$router.push('/resetpassword')">Forgot your password?</span>
            </div>
          </div>

          <div>
            <div v-if="loading" class="flex items-center justify-center gap-2 py-2 text-gray-500 sm:ml-3">
              <span class="-ml-1 mr-2 block h-5  w-5 animate-spin rounded-full border-4 border-t-blue-300" />
            </div>
            <div v-else>
              <button type="submit"
                class="flex w-full justify-center rounded-md border border-transparent
                                  bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm
                                  hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                Sign in
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
