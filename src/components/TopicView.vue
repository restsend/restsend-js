<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDownIcon, EllipsisHorizontalIcon, ExclamationCircleIcon, LinkIcon, NoSymbolIcon, PaperAirplaneIcon, ShareIcon, XCircleIcon, UserIcon, UserGroupIcon } from '@heroicons/vue/24/outline'
import { formatDate, logger } from '../sdk/utils'
import dayjs from 'dayjs'
import Modal from './ui/Modal.vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import Members from './Members.vue'
import client from '@/sdk/client'
import { buildIcon } from '@/utils'

const route = useRoute()
watch(() => route.params.id, (newVal, oldVal) => {
  const isChat = /\/chat\//i.test(route.path)
  loadTopic(newVal, isChat)
})

setTimeout(() => {
  if (route.params.id) {
    const isChat = /\/chat\//i.test(route.path)
    loadTopic(route.params.id, isChat)
  }
}, 200);

const showState = ref({
  showPerInfo: false,
  errorText: '',
  showMenu: false,
  showDetails: false,
  perInfo: '',
  duration: 0,
  silent: false,
  showDuration: false,
  showNotice: false,
})

const messageLogs = ref([])
let hasMoreLogs = ref(false)

const topic = ref({
  id: '',
  multiple: false,
  notice: { text: '' },
  owner: {},
  isAdmin: false,
  isOwner: false,
})

const refMembers = ref(null)
const content = ref('')
function resetView() {
  showState.value.errorText = ''

  topic.value.id = ''
  topic.value.notice.text = ''
  topic.value.owner = {}
  topic.value.isAdmin = false
  topic.value.isOwner = false

  messageLogs.value = []
  hasMoreLogs.value = false
  refMembers.value.syncMembers(null)
}

function loadTopic(topicId, isChat) {
  logger.debug('loadTopic', topicId)
  resetView()
  if (!topicId) {
    return
  }
  client.onTopicMessage = handleNewMessage

  if (isChat) {
    let userInfo = JSON.parse(localStorage.rsapp).userInfo
    let myId = client.myId || (userInfo && userInfo.email)
    topicId = `${myId}:${topicId}`
  }

  client.getTopic(topicId).then((val) => {
    topic.value = { ...val }
    if (val.notice) {
      topic.value.notice = { ...val.notice }
    }
    if (refMembers.value && val.multiple) {
      refMembers.value.syncMembers(topic.value)
    }
    //
    loadLastLogs()
  }).catch((err) => {
    showState.value.errorText = err.toString()
    logger.error('loadTopic', err)
  })
}

function handleNewMessage(t, chatLog) {
  if (topic.value.id != t.id) {
    return
  }

  topic.value.lastSeq = chatLog.seq > topic.value.lastSeq ? chatLog.seq : topic.value.lastSeq
  messageLogs.value.push(chatLog)
  scrollToBottom()
}

function scrollToBottom() {
  setTimeout(() => {
    const el = document.getElementById('messages')
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, 100)
}

function loadLastLogs() {
  let store = client.store.getMessageStore(topic.value.id)

  store.getMessages(topic.value.lastSeq).then(({ logs, hasMore }) => {
    // push to logs
    messageLogs.value = logs || []
    hasMoreLogs.value = hasMore
    scrollToBottom()
  })
}

function doLoadMore() {
  if (!hasMoreLogs.value || messageLogs.value.length == 0) {
    return
  }

  hasMoreLogs.value = false // 防止重复加载， 替换成loading ...
  let lastSeq = messageLogs.value[0].seq

  let store = client.store.getMessageStore(topic.value.id)
  store.getMessages(lastSeq).then(({ logs, hasMore }) => {
    messageLogs.value.unshift(...logs)
    hasMoreLogs.value = hasMore
  })
}

// 更新公告
async function handleNotice() {
  client.updateTopicNotice({
    topicId: topic.value.id,
    text: showState.value.notice.text,
  }).then(() => {
    handleSync()
  })

  showState.value.showNotice = false
  showState.value.showMenu = false
}

async function sendText() {
  client.doSendText({ topic: topic.value, text: content.value, multiple: topic.value.multiple }).then((req) => {
    content.value = ''
    scrollToBottom()
  })
}


</script>

<template>
  <main class="max-w-7xl">
    <div class="flex items-start space-x-14">
      <div class="flex h-screen w-4/5 flex-1 flex-col justify-between p-2 pb-16 pt-8 lg:py-2 ">
        <div>
          <div class="relative flex justify-between border-b py-3 sm:items-center">
            <div class="relative flex items-center space-x-4">
              <div class="relative">
                <component :is="buildIcon(topic.icon, topic.multiple ? UserGroupIcon : UserIcon)"
                  class="h-8 w-8 rounded-full"></component>
              </div>
              <div class="flex flex-col leading-tight">
                <div class="mt-1 flex items-center">
                  <span class="mr-3 text-gray-700">{{ topic.name }}</span>
                  <span v-if="showState.errorText" class="flex items-center space-x-2 text-sm text-red-500">
                    <ExclamationCircleIcon class="h-4 w-4" aria-hidden="true" />
                    <span>{{ showState.errorText }}</span>
                  </span>
                </div>
              </div>
            </div>
            <div class="">
              <a href="#" @click="showState.showMenu = !showState.showMenu">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5"
                  stroke="currentColor" class="h-6 w-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </a>

              <div v-if="showState.showMenu" class="absolute right-0  bg-white p-3 shadow-md">
                <ul v-if="sessionInfo.ownerId === client.myId" class="space-y-3">
                  <li class="cursor-pointer" @click="handleDismiss">
                    解散群聊
                  </li>
                  <li class="cursor-pointer" @click="showNotice = true">
                    更新公告
                  </li>
                </ul>
                <!-- TODO:如果不是管理员的话，是可以退出群聊的 -->
                <ul class="mt-3 space-y-3">
                  <li class="cursor-pointer" @click="handleQuit">
                    退出群聊
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div id="messages" class="mt-4 h-72 flex-auto overflow-y-auto rounded-md border bg-white shadow">
          <div v-if="hasMoreLogs" class="flex justify-center">
            <a href="#" @click="doLoadMore" class="mt-2 text-gray-600">Load more</a>
          </div>
          <div class="flex flex-col space-y-4 p-3">
            <div v-for="item in messageLogs" :key="item.id">
              <template v-if="item.senderId == client.myId">
                <div class="flex items-end justify-end">
                  <div class="order-1 mx-2 flex max-w-xs items-end space-y-2 text-sm">
                    <div class="px-2 text-xs text-gray-500">
                      {{ item.createdAt.fromNow() }}
                    </div>
                    <div class="inline-block rounded-lg rounded-br-none bg-blue-400 px-4 py-2 text-white ">
                      <span v-html="item.content.text" />
                    </div>
                  </div>
                  <img src="https://scpic.chinaz.net/files/pic/pic9/201905/zzpic18016.jpg"
                    class="order-2 h-8 w-8 rounded-full">
                </div>
              </template>
              <template v-else>
                <div class="flex items-end">
                  <div class="order-2 mx-2 flex max-w-xs items-end space-y-2 text-sm">
                    <div class="inline-block rounded-lg rounded-bl-none bg-gray-100 px-4 py-2 text-gray-700">
                      <span v-html="item.content.text" />
                    </div>
                    <div class="px-2 text-xs text-gray-500">
                      {{ item.createdAt.fromNow() }}
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>
        <div class="mt-4 rounded-md border bg-white shadow">
          <div class="relative flex h-28">
            <textarea v-model="content" placeholder="Write your message!"
              class="h-20 w-full rounded-md p-3 text-gray-600 placeholder:text-gray-300 focus:outline-none" />
            <div class="absolute bottom-1 flex w-full items-center justify-between bg-white px-6">
              <div>
                <button type="button"
                  class="inline-flex h-6 w-10 items-center justify-center rounded-full text-gray-500 transition duration-500 ease-in-out hover:bg-gray-300 focus:outline-none">
                  <LinkIcon class="h-6 w-6 text-gray-600" />
                </button>
                <button type="button"
                  class="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition duration-500 ease-in-out hover:bg-gray-300 focus:outline-none">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    class="h-6 w-6 text-gray-600">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <div>
                <button type="button"
                  class="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-2 py-1 text-white transition duration-500 ease-in-out focus:outline-none"
                  @click="sendText">
                  <span class="text-sm">Send</span>
                  <PaperAirplaneIcon class="ml-2 h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal v-if="showState.perInfo" v-model="showContacts" :dismissible="false" :width="width" :dismiss-button="false"
        class="relative">
        <template #header>
          <div class="relative flex h-full w-full items-start justify-between">
            <div class="flex space-x-4">
              <img src="https://pic1.zhimg.com/v2-cdd39f45bd5f7b525862ae7572e50c83_r.jpg?source=1940ef5c" alt=""
                class="h-10 w-10 rounded-md">
              <ul class="text-sm">
                <li class="font-normal text-gray-600">
                  urseId: <span class="font-semibold text-gray-800">{{ showState.perInfo.userId }}</span>
                </li>
              </ul>
            </div>
            <XCircleIcon class="absolute -right-3 -top-3 h-5 w-5 cursor-pointer text-gray-500 lg:-top-5"
              @click="handleCloseModal" />
            <EllipsisHorizontalIcon class="h-6 w-6 cursor-pointer text-gray-500" @click="showInfo = !showInfo" />
            <div v-if="showInfo"
              class="absolute right-0 top-5 z-50 flex w-64 flex-col justify-between rounded-md bg-gray-50 py-2 shadow-lg">
              <ul class="space-y-4 text-sm font-medium text-gray-600">
                <li class="flex cursor-pointer items-center space-x-3 border-b border-gray-300 px-3 py-2">
                  <ShareIcon class="h-5 w-5 text-gray-500" />
                  <p>Shared Bob</p>
                </li>
                <li class="flex cursor-pointer items-center space-x-3 border-b border-gray-300 px-3 pb-2">
                  <NoSymbolIcon class="h-5 w-5 text-gray-500" />
                  <p>Add Bob to the blacklist</p>
                </li>
              </ul>
            </div>
          </div>
        </template>
        <template #footer>
          <div class="mt-3 flex w-full justify-center text-sm">
            <span v-if="contacts" class="cursor-pointer rounded-md bg-indigo-400 px-4 py-1.5 text-white"
              @click="goToContacts(item)">Send a message</span>
            <span v-else class="cursor-pointer rounded-md bg-indigo-400 px-4 py-1.5 text-white"
              @click="showApplyContacts = true">Add a contact</span>
          </div>
        </template>
        <div v-if="showApplyContacts" class="absolute z-50 flex w-80 flex-col justify-between rounded-md bg-gray-100 p-5">
          <ul class="space-y-4 text-sm text-gray-700">
            <p class="text-center font-semibold">
              发送添加朋友申请
            </p>
            <li class="space-y-1">
              <p>好友id:</p>
              <div><Input v-model:value="form.topicId" placeholder="test@qq.com" class="text-base text-gray-800" /></div>
            </li>
            <li class="space-y-1">
              <p>备注</p>
              <div><Input v-model:value="form.memo" placeholder="Bob" class="text-base text-gray-800" /></div>
            </li>
            <li class="space-y-1">
              <p>source</p>
              <div><Input v-model:value="form.source" placeholder="from" class="text-base text-gray-800" /></div>
            </li>
            <li class="space-y-1">
              <p>message</p>
              <div><Input v-model:value="form.message" placeholder="todo" class="text-base text-gray-800" /></div>
            </li>
          </ul>
          <div class="space-x-6 pt-10">
            <Button type="primary" @click="handleApply(form)">
              确定
            </Button>
            <Button class="bg-gray-200 text-primary-500" @click="showApplyContacts = false">
              取消
            </Button>
          </div>
        </div>
      </Modal>

      <div v-show="topic.multiple" class="mt-16 w-1/5 shrink-0">
        <p class="font-semibold">
          公告
        </p>

        <div class="mt-2 flex w-full flex-col justify-between rounded-md bg-white p-3 shadow-md"
          :class="[showState.showDetails ? 'h-80 w-64' : 'h-24']">
          <p class="row-span-2"
            :class="[showState.showDetails ? 'h-72 w-60 overflow-y-auto' : 'h-20 overflow-hidden text-ellipsis']">
            {{ topic.notice.text }}
          </p>
          <div class="flex items-end justify-between space-y-2 ">
            <span class="text-sm"> <span class="ml-1 text-xs font-light"> {{ topic.notice.updatedAt?.fromNow()
            }}</span></span>
            <ChevronDownIcon class="w-5 cursor-pointer text-gray-400 duration-200"
              :class="[showState.showDetails ? 'rotate-180' : '']" @click="flux.showdetails = !flux.showdetails" />
          </div>
        </div>
        <Members ref="refMembers" />
      </div>

      <Modal v-model="showState.showNotice" :dismissible="false" width="sm" :dismiss-button="false" class="relative">
        <template #header>
          <div class="flex w-full items-start justify-between">
            <span class="text-gray-800">Update Notice</span>
            <XCircleIcon class="h-5 w-5 cursor-pointer text-gray-400" @click="showState.showNotice = false" />
          </div>
        </template>

        <textarea v-model="topic.notice.text" spacehold="update"
          class="h-32 w-full rounded-md border border-gray-300 px-3 py-2" />

        <template #footer>
          <div class="space-x-4">
            <Button type="primary" @click="handleNotice">
              Update
            </Button>
            <Button class="mr-2" @click="showState.showNotice = false">
              Cancel
            </Button>
          </div>
        </template>
      </Modal>
    </div>
  </main>
</template>
