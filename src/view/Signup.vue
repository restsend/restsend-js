<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

import backend from '../sdk/backend'

const router = useRouter()
const firstname = ref('')
const lastname = ref('')
const email = ref('')
const password = ref('')

// 错误信息
const passwordError = ref('')
const emailError = ref('')

// 发送请求的加载效果
const loading = ref(false)

async function doSignup(e) {
    e.preventDefault()

    if (password.value.length <= 5) {
        passwordError.value = 'Your password must be more than 5 characters.'
        return
    }

    // loading.value = true
    const resp = await backend.post('/auth/register', {
        firstname: firstname.value,
        lastname: lastname.value,
        email: email.value,
        password: password.value,
        locale: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })    
    router.push('/')
}
</script>

<template>
  <div class="mt-10 flex min-h-full flex-col justify-center sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
        Free Sign Up
      </h2>
      <p class="mt-2 text-center text-sm text-gray-600">
        Create your account, it takes less than a mintue
      </p>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white p-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-5" method="POST" @submit="doSignup">
          <div class="flex">
            <div>
              <label for="first-name" class="block text-sm font-medium text-gray-700">First Name</label>
              <div class="mt-1">
                <input
                  id="first-name" v-model="firstname" name="first-name" type="text" autocomplete="first-name"
                  class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-1 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
              </div>
            </div>

            <div class="ml-6">
              <label for="last-name" class="block text-sm font-medium text-gray-700">Last Name</label>
              <div class="mt-1">
                <input
                  id="last-name" v-model="lastname" name="last-name" type="text" autocomplete="last-name"
                  class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-1 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                >
              </div>
            </div>
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <div class="mt-1">
              <input
                id="email" v-model="email" name="email" type="email" autocomplete="email" required
                class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-1 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                :style="{ borderColor: emailError ? 'red' : '' }"
                @click="emailError = ''"
              >
              <p v-if="emailError" class="mt-2 text-sm text-red-600">
                {{ emailError }}
              </p>
            </div>
          </div>

          <div :class="[isActive ? activeClass : '', errorClass]">
            <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
            <div class="mt-1">
              <input
                id="password" v-model="password" name="password" type="password" required
                class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-1 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
                :style="{ borderColor: passwordError ? 'red' : '' }"
                @click="passwordError = ''"
              >
              <p v-if="passwordError" class="mt-2 text-sm text-red-600">
                {{ passwordError }}
              </p>
            </div>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex items-center">
              <input
                id="accept" name="accept" type="checkbox" required
                class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              >
              <p for="accept" class="ml-2 block text-sm text-gray-900">
                I accept <a href="https://restsend.com/privacy.html" class="ml-1 text-gray-500 underline">Terms
                  and Conditions</a>
              </p>
            </div>
          </div>

          <div v-if="loading" class="flex items-center justify-center gap-2 py-2 text-gray-500 sm:ml-3">
            <span class="-ml-1 mr-2 block h-5  w-5 animate-spin rounded-full border-4 border-t-blue-300" />
          </div>
          <div v-else>
            <button
              type="submit"
              class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Sign up
            </button>
          </div>
        </form>
      </div>
    </div>

    <div class="mt-6 text-center text-sm text-gray-400">
      Already have account?
      <div
        class="ml-1 cursor-pointer underline"
        @click="$router.push('/signin')"
      >
        Sign In
      </div>
    </div>
  </div>
</template>
