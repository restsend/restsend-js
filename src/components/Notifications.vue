<script setup>
  import {
    ArrowPathIcon,
    ChartPieIcon,
    HomeIcon,
    UsersIcon,
  } from '@heroicons/vue/24/outline'
  import { useRouter } from 'vue-router'
  import  {useAppStore} from '@/store'

  const appStore = useAppStore()

  const navigation = [
    { name: 'Friend knocks', content: 'Your friend added you', href: '/notifications/friends', icon: UsersIcon, current: false },
    { name: 'Topic knocks', content: '入群申请', href: '/notifications/topics', icon: HomeIcon, current: false },
    { name: 'System messages', content: 'There was a recent login to you accent from this device', href: '/notifications/sys', icon: ChartPieIcon, current: false },
  ]

  const router = useRouter()

  function selectTab(item) {
    appStore.sidebarOpen = false
    router.push(item.href)
  }
</script>

<template>
  <div class="fixed h-screen w-full lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
    <div class="flex h-screen grow flex-col gap-y-5 overflow-y-auto border-gray-200 bg-white px-6 lg:border-l">
      <div class="flex h-16 shrink-0 items-center">
        Notifications
      </div>
      <nav class="flex flex-1 flex-col">
        <ul role="list" class="-mx-2 space-y-4">
          <li v-for="item in navigation" :key="item.name">
            <a
                    class="group flex cursor-pointer gap-x-3 rounded-md p-2 text-sm font-semibold leading-6"
                    :class="[item.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600']"
                    @click="selectTab(item)"
            >
              <component :is="item.icon" class="h-8 w-8 shrink-0 rounded-full bg-green-100 p-2" :class="[item.current ? 'bg-indigo-100 text-indigo-600' : 'text-green-400 group-hover:bg-indigo-100 group-hover:text-indigo-600']" aria-hidden="true" />
              <div>
                <p>{{ item.name }}<span style="color: red" v-if="item.href.indexOf('friends') > -1">({{appStore.applicationList.length}})</span></p>
                <p class="w-64 truncate text-sm font-normal lg:w-48">{{ item.content }}</p>
              </div>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
