<script setup>
  import { ref } from 'vue'
  import { EllipsisHorizontalIcon, SpeakerWaveIcon, SpeakerXMarkIcon, UserMinusIcon, XCircleIcon, NoSymbolIcon, ShareIcon } from '@heroicons/vue/24/solid'

  import Button from './ui/Button.vue'
  import Input from './ui/Input.vue'
  import Modal from './ui/Modal.vue'
  import Checkbox from './ui/Checkbox.vue'
  import client from '@/sdk/client'
  import { logger } from '@/sdk/utils'


  defineExpose({
    syncMembers
  })

  const form = ref({
    userId: '',
    source: '',
    message: '',
    memo: '',
  })

  const topic = ref({})
  let membersUpdatedAt = undefined

  const flux = ref({
    showContacts: false,
    showApplyContacts: false,
    showInfo: false,
    perInfo: '',
    showDuration: false,
    duration: '',
    silent: false,
    silentMember: false,
    silentMemberDuration: '',
    members: [],
  })

  function resetView() {
    flux.value.members = []
  }

  function syncMembers(currentTopic) {
    // TODO: 加载群成员， 如果数量大于100，需要显示加载更多，最多显示100个
    topic.value = currentTopic
    resetView()
    if (!currentTopic) {
      return
    }


    logger.debug('begin syncMembers', topic.value.id)

    let doSync = async () => {
      let { items, updatedAt, hasMore } = await client.getTopicMembers({
        topicId: topic.value.id,
        updatedAt: membersUpdatedAt,
        limit: 100,
      })
      flux.value.members.push(...items)
      if (flux.value.members.length > 100) {
        // TODO: 显示加载更多
      } else {
        membersUpdatedAt = updatedAt
        if (hasMore) {
          await doSync()
        }
      }
    }

    doSync().then(() => {
      logger.debug('syncMembers done', topic.value.id, "members", flux.value.members.length)
    })
  }

  async function silentTopic(duration, type) {
    if (type) {
      await client.silentTopic({
        topicId: topic.value.topicId,
        duration: flux.value.duration,
      })
      flux.value.showDuration = true
      flux.value.silent = false
    }
    else {
      await client.silentTopic({
        topicId: flux.value.topicId,
      })
      flux.value.showDuration = false
      flux.value.silent = false
    }
  }

  // 查看个人信息
  async function handlePerInfo(id) {
    flux.value.perInfo = await client.getUser(id)
    flux.value.showContacts = true
  }

  function handleCloseModal() {
    flux.value.showContacts = false
    flux.value.showApplyContacts = false
    flux.value.showInfo = false
  }

  // 禁言某个成员，如果不传duration，则解除禁言
  async function silentMember(item, duration) {
    if (duration) {
      await client.silentTopicMember({
        topicId: topic.value.topicId,
        userId: item.userId,
        duration,
      })
      handleGroupMembers()
      item.silentMember = false
      item.silentUser = true
    }
    else {
      await client.silentTopicMember({
        topicId: topic.value.topicId,
        userId: item.userId,
      })
      item.silentMember = false
      item.silentUser = false
    }
  }

  // 添加联系人
  async function handleApply() {
    await client.addContact({
      userId: form.value.userId,
      source: form.value.source,
      message: form.value.message,
      memo: form.value.memo,
    })
    flux.value.showApplyContacts = false
  }
  // 踢出某个成员
  async function handleKickout(item) {
    await client.removeTopicMember({
      topicId: topic.value.topicId,
      userId: item.userId,
    })
    handleGroupMembers()
  }
  function  getGroupId(){
    return location.href.split('/topic/')[1]
  }
</script>

<template>
  <div v-if="topic" class="mt-6">
    <p>群主<span class="ml-4 font-semibold">{{ topic?.owner?.displayName }}</span> </p>
    <div>群ID:   {{getGroupId()}}</div>
    <div v-if="topic.isOwner || topic.isOwner" class="relative flex space-x-4 py-2">
      <SpeakerXMarkIcon v-if="flux.showDuration" class="ml-2 h-5 w-5 cursor-pointer text-gray-600"
                        @click="silentTopic()" />
      <SpeakerWaveIcon v-else class="ml-2 h-5 w-5 cursor-pointer text-gray-600" @click="flux.silent = true" />
    </div>
    <div v-if="flux.silent" class="flex w-full items-center">
      <span class="text-sm">禁言时间</span>
      <span class="ml-3 w-1/4"><Input v-model:value="flux.duration" placeholder="1h" /></span>
      <Button type="primary" class="ml-3" @click="silentTopic(duration, 'silent')">
        sure
      </Button>
    </div>
    <span class="mt-2 font-semibold">成员</span>
    <span class="ml-2">{{ topic.members }}</span>
    <ul v-for="item in flux.members ?? [] " :key="item" class="mt-2 space-y-2">
      <li class="flex items-center">
        <Checkbox />
        <span class="ml-2 cursor-pointer" @click="handlePerInfo(item.userId)">{{ item.userId }}</span>
        <template v-if="topic.isOwner || topic.isAdmin">
          <UserMinusIcon class="ml-auto h-5 w-5 text-gray-500" @click="handleKickout(item)" />
          <SpeakerXMarkIcon v-if="item.silentUser" class="ml-2 h-5 w-5 text-gray-500" @click="silentMember(item)" />
          <SpeakerWaveIcon v-else class="ml-2 h-5 w-5 text-gray-500" @click="item.silentMember = true" />
        </template>
      </li>
      <div v-if="item.silentMember" class="flex w-full items-center bg-white p-2 shadow-md">
        <span class="text-sm">禁言时间</span>
        <span class="ml-3 w-1/4"><Input v-model:value="flux.silentMemberDuration" placeholder="1h" /></span>
        <Button type="primary" class="ml-3" @click="silentMember(item, flux.silentMemberDuration)">
          sure
        </Button>
      </div>
    </ul>
  </div>
  <Modal v-if="flux.perInfo" v-model="flux.showContacts" :dismissible="false" :width="sm" :dismiss-button="false"
         class="relative">
    <template #header>
      <div class="relative flex h-full w-full items-start justify-between">
        <div class="flex space-x-4">
          <img src="https://pic1.zhimg.com/v2-cdd39f45bd5f7b525862ae7572e50c83_r.jpg?source=1940ef5c" alt=""
               class="h-10 w-10 rounded-md">
          <ul class="text-sm">
            <li class="font-normal text-gray-600">
              urseId: <span class="font-semibold text-gray-800">{{ flux.perInfo.userId }}</span>
            </li>
          </ul>
        </div>
        <XCircleIcon class="absolute -right-3 -top-3 h-5 w-5 cursor-pointer text-gray-500 lg:-top-5"
                     @click="handleCloseModal" />
        <EllipsisHorizontalIcon class="h-6 w-6 cursor-pointer text-gray-500" @click="flux.showInfo = !flux.showInfo" />
        <div v-if="flux.showInfo"
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
              @click="flux.showApplyContacts = true">Add a contact</span>
      </div>
    </template>
    <div v-if="flux.showApplyContacts"
         class="absolute z-50 flex w-80 flex-col justify-between rounded-md bg-gray-100 p-5">
      <ul class="space-y-4 text-sm text-gray-700">
        <p class="text-center font-semibold">
          发送添加朋友申请
        </p>
        <li class="space-y-1">
          <p>好友id:</p>
          <div><Input v-model:value="form.userId" placeholder="test@qq.com" class="text-base text-gray-800" /></div>
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
        <Button class="bg-gray-200 text-primary-500" @click="flux.showApplyContacts = false">
          取消
        </Button>
      </div>
    </div>
  </Modal></template>
