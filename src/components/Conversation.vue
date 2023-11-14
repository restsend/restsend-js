<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { TrashIcon, UserIcon, UserGroupIcon } from '@heroicons/vue/24/solid'

import { useAppStore } from '@/store'
import { buildIcon } from '@/utils'
import client from '@/sdk/client'

const router = useRouter()
const appStore = useAppStore()

const conversations = ref([])

onMounted(() => {
  client.onConversationUpdated = handleConversationUpdated
  client.onConversationRemoved = handleConversationRemoved
  client.beginSyncConversations()
})


function handleConversationUpdated(conversation) {
  for (let idx = 0; idx < conversations.value.length; idx++) {
    const item = conversations.value[idx];
    if (item.topicId == conversation.topicId) {
      if (item.lastSeq > conversation.lastSeq) {
        return
      }
      conversations.value.splice(idx, 1)
    }
  }

  let pos = conversations.value.length
  for (let idx = 0; idx < conversations.value.length; idx++) {
    const item = conversations.value[idx];
    if (conversation.updatedAt.unix() >= item.updatedAt.unix()) {
      pos = idx
      break
    }
  }
  conversations.value.splice(pos, 0, conversation)
}

function handleConversationRemoved(topic) {
  conversations.value.forEach((item, index) => {
    if (item.topicId == topic.topicId) {
      conversations.value.splice(index, 1)
    }
  })
}

function doRemove(topic) {
  client.removeConversation(topic.topicId)
}

function selectTopic(topic) {
  appStore.sidebarOpen = false
  conversations.value.forEach((item) => {
    item.selected = item.topicId === topic.topicId
  })
  if (topic.multiple) {  
    router.push(`/topic/${topic.topicId}`)
  } else {
    router.push(`/chat/${topic.attendee}`)
  }
}

</script>

<template>
  <div class="fixed w-full lg:inset-y-0 lg:z-20 lg:flex lg:w-72 lg:flex-col">
    <div class="flex h-screen grow flex-col gap-y-5 overflow-y-auto border-gray-200 bg-white px-6 lg:border-l">
      <div class="flex h-16 shrink-0 items-center">
        Messages {{ conversations.length }}
      </div>
      <nav class="flex flex-1 flex-col">
        <ul role="list" class="-mx-2 space-y-4">
          <li v-for="item in conversations" :key="item.topicId" class="group flex items-start" :lastseq="item.lastSeq">
            <a :class="[item.selected ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600']"
              class="group flex cursor-pointer rounded-md p-2 text-sm font-semibold leading-6" @click="selectTopic(item)">
              <component :is="buildIcon(item.icon, item.multiple ? UserGroupIcon : UserIcon)" class="h-6 w-6 shrink-0"
                :class="[item.selected ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600']"
                aria-hidden="true" />
              <div class="w-full">
                <div class="flex w-full items-center justify-between">
                  <p class="w-60 truncate lg:w-40">{{ item.name }}</p>
                  <p class="text-xs font-light">{{ item.updatedAt.fromNow() }}</p>
                </div>
                <div class="flex items-center justify-between">
                  <p v-if="item.lastMessage" class="w-64 truncate text-sm font-normal lg:w-48">
                  <p>{{ item.lastMessage.text }}</p>
                  <p> {{ item.lastMessage.sender.displayName }}</p>
                  </p>
                </div>
              </div>
            </a>
            <div>
              <TrashIcon class="invisible ml-3 mt-2 h-5 w-5 shrink-0 cursor-pointer text-gray-500 group-hover:visible"
                aria-hidden="true" @click="doRemove(item)" />
            </div>
          </li>
        </ul>
      </nav>
    </div>
  </div>
</template>
