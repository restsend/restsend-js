<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BellIcon, ChatBubbleOvalLeftIcon, Cog6ToothIcon, UserIcon } from '@heroicons/vue/24/solid'
import { useAppStore } from '@/store'

const appStore = useAppStore()
const router = useRouter()
const route = useRoute()
const id = ref(route.params.id)

const navbar = [
  { href: '/', icon: ChatBubbleOvalLeftIcon, current: ref(true) },
  { href: '/setting', icon: Cog6ToothIcon, current: ref(false) },
]

function selectTab(item) {
  navbar.forEach((item) => {
    item.current.value = false
  })
  item.current.value = true
  appStore.setSideBar(true)
  router.push(item.href)
}
</script>

<template>
  <div class="fixed bottom-0 left-0 z-50 w-full lg:hidden">
    <div class="flex border-t border-t-gray-100 bg-white px-4  py-1 text-gray-500">
      <ul class="flex w-full">
        <li v-for="item in navbar.slice(0, 3)" :key="item" class="relative w-3/4">
          <component :is="item.icon" class="h-8 w-8 shrink-0 cursor-pointer"
            :class="[item.current.value === true ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600']"
            @click="selectTab(item)" />
          <!-- <div class="absolute left-4 top-4 flex h-4 w-4  items-center justify-center rounded-full  bg-red-500 p-0.5 text-xs text-white">
                <span class="text-center">8</span>
                <span v-else class="w-5 h-4 text-center">9+</span>
              </div>-->
        </li>

        <li v-for="item in navbar.slice(3, 4)" :key="item" class="relative w-1/4">
        <component :is="item.icon" class="h-8 w-8 shrink-0 cursor-pointer"
          :class="[item.current.value === true ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600']"
          @click="selectTab(item)" />
        <!--<div class="absolute left-4 top-4 flex h-4 w-4  items-center justify-center rounded-full  bg-red-500 p-0.5 text-xs text-white">
                <span class="text-center">8+</span>
                 <span v-else class="w-5 h-4 text-center">9+</span>
              </div>-->
        </li>
      </ul>
    </div>
  </div>
  <div class="fixed left-0 hidden h-full w-20 lg:block">
  <div class="h-full px-4 py-10 text-gray-500 sm:p-6">
    <ul class="flex h-full flex-col justify-between">
      <li>
          <ul class="space-y-10">
            <li v-for="item in navbar.slice(0, 3)" :key="item" class="relative w-full">
              <div style="display: flex">
                <component :is="item.icon" class="h-8 w-8 shrink-0 cursor-pointer"
                  :class="[item.current.value === true ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600']"
                  @click="selectTab(item)" />
                <span style="color: red;padding: 0 5px;margin-top: 5px"
                  v-if="(item.href.indexOf('notifications') > -1) && appStore.applicationList.length">{{
                    appStore.applicationList.length }}</span>
              </div>
              <!--
                 <div class="absolute right-0.5 top-4 flex h-4 w-4  items-center justify-center rounded-full  bg-red-500 p-0.5 text-xs text-white">
                   <span class="text-center">8</span>
                   <span v-else class="w-5 h-4 text-center">9+</span>
                 </div> -->
            </li>
          </ul>
        </li>
        <li v-for="item in navbar.slice(3, 4)" :key="item" class="relative w-full">
          <component :is="item.icon" class="h-8 w-8 shrink-0 cursor-pointer"
            :class="[item.current.value === true ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600']"
            @click="selectTab(item)" />
          <!--<div class="absolute right-0.5 top-4 flex h-4 w-4  items-center justify-center rounded-full  bg-red-500 p-0.5 text-xs text-white">
               <span class="text-center">8</span>
               <span v-else class="w-5 h-4 text-center">9+</span>
             </div> -->
        </li>
      </ul>
    </div>
  </div>
</template>
