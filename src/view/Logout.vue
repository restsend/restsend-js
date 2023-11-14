<script setup>
import { onMounted } from 'vue';
import  {useAppStore} from '../store'
import client from '@/sdk/client';
const appStore = useAppStore()

onMounted(() => {
  client.logout().then(() => {
    appStore.logout()
  })
})

</script>

<template>
  <div class="my-52 pt-8 text-center">
    <div class="sm:pl-6">
      <h1 class="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
        See You Again !
      </h1>
      <p class="mt-10 text-base text-gray-500">
        You are now successfully sign out.
      </p>
    </div>
    <div class="mt-10 flex w-full justify-center">
      <!--    href="/auth/login?next=/app" -->
      <a
        href="/signin"
        class="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >Sign In</a>
    </div>
  </div>
</template>
