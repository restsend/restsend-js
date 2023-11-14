<script setup>
  import { computed, onMounted, ref, watch } from 'vue'
  import { ChatBubbleLeftEllipsisIcon, EllipsisVerticalIcon, MinusCircleIcon, NoSymbolIcon, ShareIcon, TrashIcon, UserGroupIcon, UserPlusIcon, XCircleIcon, XMarkIcon } from '@heroicons/vue/24/solid'

  import SearchInput from '../components/ui/SearchInput.vue'
  import { ISOStringDate, logger, getFirstLetter } from '../sdk/utils'
  import Input from './ui/Input.vue'

  import Modal from './ui/Modal.vue'
  import Button from './ui/Button.vue'
  import Checkbox from './ui/Checkbox.vue'
  import client from '@/sdk/client'
  import router from '@/router'
  import NotifyCenter from './NotifyCenter.vue'
  import ServicesApi from './../sdk/services.js'
  const service = new ServicesApi()


  const showState = ref({
    showApplyContacts: false,
    showGroupChat: false,
    showApplyGroupChat: false,
    keyword: '',
    showModal: false,
    userList:[],
  })

  const applyForm = ref({
    userId: '',
    topicId: '',
    source: '',
    message: '',
    memo: '',
  })

  class ContactLetterGroup {
    constructor(letter) {
      this.letter = letter
      this.contacts = []
    }

    get empty() {
      return this.contacts.length == 0
    }

    update(contact) {
      let pos = this.contacts.findIndex(item => item.id == contact.id)
      if (pos >= 0) {
        this.contacts.splice(pos, 1, contact)
      } else {
        this.contacts.push(contact)
      }
      // 排序
      this.contacts.sort((a, b) => {
        let nameA = a.displayName || a.id
        let nameB = b.displayName || b.id
        return nameA.localeCompare(nameB)
      })
    }

    remove(contact) {
      let pos = this.contacts.findIndex(item => item.id == contact.id)
      if (pos >= 0) {
        this.contacts.splice(pos, 1)
      }
    }
  }

  function initLetterGroups() {
    let groups = []
    for (let i = 0; i < 9; i++) {
      groups.push(new ContactLetterGroup(i.toString()))
    }

    for (let i = 0; i < 26; i++) {
      groups.push(new ContactLetterGroup(String.fromCharCode(65 + i)))
    }
    groups.push(new ContactLetterGroup('#'))
    return groups
  }

  const selected = ref([])
  const contactGroups = ref(initLetterGroups())
  const topicGroups = ref(initLetterGroups())


  onMounted(() => {
    console.log('Contacts onMounted')
    client.onContactUpdated = handleContactUpdated
    client.onContactRemoved = handleContactRemoved
    client.beginSyncContacts()
  })


  function handleSearch() {
    // TODO: 搜索联系人
  }

  function getOrCreateLetterGroup(contact) {
    let displayName = contact.displayName || contact.id
    let letter = getFirstLetter(displayName)
    let group = contactGroups.value.find(item => item.letter == letter)
    if (!group) {
      group = contactGroups.value[contactGroups.value.length - 1]
    }
    return group
  }

  function handleContactUpdated(contact) {
    getOrCreateLetterGroup(contact).update(contact)
  }

  function handleContactRemoved(contact) {
    getOrCreateLetterGroup(contact).remove(contact)
  }

  function handleApplyContact() {
    // 添加联系人
    client.addContact({ userId: applyForm.value.userId, message: applyForm.value.message, memo: applyForm.value.memo, source: applyForm.value.source })
    showState.value.showApplyContacts = false
  }
  async  function handleApplyGroupChat() {
    // 99999999999999999
    // 申请入群
    const aa =  service.joinGroup(applyForm.value.topicId, applyForm.value.source, applyForm.value.message, applyForm.value.memo)
    console.log(aa)
    showState.value.showApplyGroupChat = false
  }

  function tryChatWithUser(contact) {
    contact.showContacts = false
    client.tryChatWithUser(contact).then(topic => {
      logger.debug('tryChatWithUser ok', topic, contact.id)
      if (topic) {
        router.push('/chat/' + contact.id)
      }
    })
  }
  function toContacts() {
  }
  async function  getContacts(){
    showState.value.showGroupChat = true
    let list = await service.getContacts(undefined, 50)
    showState.value.userList = list
  }
  async function handleCreateGroup(){
    let info = await service.createGroup('', '', selected._rawValue)
  }


</script>

<template>
  <div class="fixed  w-full overflow-y-auto lg:inset-y-0 lg:z-10 lg:flex lg:w-72 lg:flex-col">
    <div class="flex h-screen grow flex-col  gap-y-5 border-gray-200 bg-white px-6 lg:border-l">
      <div class="relative flex h-16 shrink-0 items-center justify-between">
        <div class="relative flex w-full items-center justify-between">
          <span style="cursor: pointer" @click="toContacts" > Contacts</span>
          <!--            顶部BM777-->
          <UserPlusIcon class="h-5 w-5 cursor-pointer text-gray-500" @click="showState.showApplyContacts = true" />
          <span>
<!--            <UserGroupIcon class="h-5 w-5 cursor-pointer text-gray-500" @click="showState.showGroupChat = true" />-->
            <UserGroupIcon class="h-5 w-5 cursor-pointer text-gray-500" @click="getContacts" />
          </span>
          <Button type="primary" @click="showState.showApplyGroupChat = true">
            申请群聊
          </Button>


          <div v-if="showState.showApplyContacts"
               class="absolute -left-4 top-10 z-50 flex w-64 flex-col justify-between rounded-md bg-gray-100 p-5">
            <ul class="space-y-4 text-sm text-gray-700">
              <p class="text-center font-semibold">
                添加朋友申请
              </p>
              <li class="space-y-1">
                <p>UserID:</p>
                <div><Input v-model:value="applyForm.userId" placeholder="User id " class="text-base text-gray-800" />
                </div>
              </li>
              <li class="space-y-1">
                <p>备注</p>
                <div><Input v-model:value="applyForm.memo" placeholder="Bob" class="text-base text-gray-800" /></div>
              </li>
              <li class="space-y-1">
                <p>source</p>
                <div><Input v-model:value="applyForm.source" placeholder="from" class="text-base text-gray-800" />
                </div>
              </li>
              <li class="space-y-1">
                <p>message</p>
                <div><Input v-model:value="applyForm.message" placeholder="todo" class="text-base text-gray-800" />
                </div>
              </li>
            </ul>
            <div class="space-x-6 pt-10">
              <Button type="primary" @click="handleApplyContact()">
                确定
              </Button>
              <Button class="bg-gray-200 text-primary-500" @click="showState.showApplyContacts = false">
                取消22
              </Button>
            </div>
          </div>
        </div>
        <Modal v-model="showState.showGroupChat" :dismissible="false" width="sm" :dismiss-button="false" class="relative">
          <!-- <div v-if="showGroupChat" class="fixed left-20 top-8  z-20 rounded-md bg-gray-100 px-2 py-3"> -->
          <div class="flex justify-end">
            <XMarkIcon class="h-5 w-5 cursor-pointer" @click="showState.showGroupChat = false" />
          </div>

          <ul role="list" class="mt-3 space-y-4">
            <!--            <template v-for="group in topicGroups" :key="group.letter">-->
            <template v-for="group in 1" :key="group.letter">
              <li v-if="!group.empty" class="rounded-md text-sm text-gray-600">
                <p class="px-2 font-semibold">
                  {{ group.letter }}
                </p>
                <!--                <div v-for="item in group.contacts" .key="item.id"-->
                <div v-for="item in showState.userList.items" .key="item.id"
                     class="group relative flex w-full items-center rounded-md px-2 hover:bg-gray-50">
                  <Checkbox v-model="selected" :value="item.userId" class="ml-3 cursor-pointer text-primary-500">
                    <p class="ml-3">
                      {{ item.name }}
                    </p>
                  </Checkbox>
                </div>
              </li>
            </template>
          </ul>
          <div class="mt-20 space-x-4 text-right">
            <Button type="primary" @click="handleCreateGroup(selected)">
              Create111
            </Button>
            <Button @click="showState.showGroupChat = false">
              Cancle
            </Button>
          </div>
        </Modal>

        <div class="absolute rounded-md">
          <Modal v-model="showState.showApplyGroupChat" :dismissible="false" width="sm" :dismiss-button="false"
                 class="relative">
            <template #header>
              <div class="flex w-full items-start justify-between">
                <span class="text-red-500">申请入群</span>
                <XCircleIcon class="h-5 w-5 cursor-pointer text-gray-400" @click="showState.showApplyGroupChat = false" />
              </div>
            </template>
            <div class="space-y-3">
              <div class="w-full">
                <label>groupId</label>
                <Input v-model:value="applyForm.topicId" placeholder="two group" class="mt-1 text-base text-gray-800" />
              </div>
              <div class="">
                <label>source</label>
                <Input v-model:value="applyForm.source" placeholder="" class="mt-1 text-base text-gray-800" />
              </div>
              <div>
                <label>message</label>
                <Input v-model:value="applyForm.message" placeholder="" class="mt-1 text-base text-gray-800" />
              </div>
              <div>
                <label>memo</label>
                <Input v-model:value="applyForm.memo" placeholder="xxxx" class="mt-1 text-base text-gray-800" />
              </div>
            </div>
            <template #footer>
              <div class="space-x-4">
                <Button type="primary" @click="handleApplyGroupChat()">
                  Apply
                </Button>
                <Button class="mr-2" @click="showState.showApplyGroupChat = false">
                  Cancel
                </Button>
              </div>
            </template>
          </Modal>
        </div>
      </div>

      <div>
        <SearchInput v-model:keyword="showState.keyword" placeholder="Search contacts" @search="handleSearch" />
      </div>
      <nav class="relative flex flex-1 flex-col">
        <ul role="list" class="space-y-4">
          <template v-for="group in contactGroups" :key="group.letter">
            <li v-if="!group.empty" class="rounded-md text-sm text-gray-600">
              <p class="px-2 font-semibold">
                {{ group.letter }}
              </p>
              <div v-for="item in group.contacts" :key="item.id"
                   class="group relative flex w-full items-center justify-between rounded-md px-2 hover:bg-gray-50">
                <a class="my-2 cursor-pointer" :class="[item.isBlocked ? 'text-red-500' : 'text-gray-600']">{{ item.displayName }}
                  <span v-if="item.isBlocked" class="text-xs">(blocked)</span></a>
                <div v-if="item.showContacts"
                     class="absolute -right-4 z-50 flex w-40 flex-col justify-between rounded-md bg-gray-50 py-2 shadow-lg">
                  <ul class="space-y-4 text-sm font-medium text-gray-600">
                    <div class="border-b border-gray-300 py-2 text-center font-semibold text-gray-700">
                      {{ item.displayName }}
                    </div>
                    <li class="flex cursor-pointer items-center px-3">
                      <div class="flex w-full items-center justify-between text-gray-500">
                        <MinusCircleIcon v-if="item.isBlocked" class="h-5 w-5 text-gray-500" @click="removeBlocked(item)" />
                        <NoSymbolIcon v-else class="h-5 w-5 text-gray-500" @click="addBlocked(item)" />
                        <ChatBubbleLeftEllipsisIcon class="h-5 w-5 text-gray-500" @click="tryChatWithUser(item)" />
                        <ShareIcon class="h-5 w-5" />
                        <TrashIcon class="h-5 w-5" />
                      </div>
                    </li>
                  </ul>
                </div>
                <EllipsisVerticalIcon class="invisible h-5 w-5 cursor-pointer text-gray-500 group-hover:visible"
                                      @click="item.showContacts = true" />
                <div v-if="item.showContacts" class="fixed inset-x-0 top-0 z-40 h-full w-full"
                     @click="item.showContacts = false" />
              </div>
            </li>
          </template>
        </ul>
        <div class="absolute">
          <Modal v-model="showState.showModal" :dismissible="false" width="sm" :dismiss-button="false" class="relative">
            <template #header>
              <div class="flex w-full items-start justify-between">
                <span class="text-red-500"> Delete</span>
                <XCircleIcon class="h-5 w-5 cursor-pointer text-gray-400" @click="showState.showModal = false" />
              </div>
            </template>
            Bob Alice
            <template #footer>
              <div class="space-x-4">
                <Button type="primary" @click="showState.showModal = false">
                  Delete
                </Button>
                <Button class="mr-2" @click="showState.showModal = false">
                  Cancel
                </Button>
              </div>
            </template>
          </Modal>
        </div>
      </nav>
    </div>
  </div>
</template>
