<script setup>
import { onMounted, ref } from 'vue'
import Button from './ui/Button.vue'
import Input from './ui/Input.vue'
import ServicesApi from './../sdk/services.js'
import client from '@/sdk/client'
import { useAppStore } from '@/store'

const service = new ServicesApi()

const store = useAppStore()

const list = ref()
const form = ref({
  userId: '',
  message: '',
  memo: '',
})

const modal = ref({
  showApplication: false,
  showAcception: false,
})

async function getGroupApplyList() {
  list.value = await service.getAllGroupApplyList()
  console.log(list)
}

onMounted(() => {
  getGroupApplyList()
})

function handleApplication(item, type) {
  if (type)
    modal.value.showAcception = true
  else
    modal.value.showAcception = false
  item.showApplication = true
}

async function handleAccept(item) {
  await service.acceptGroup({
    topicId: item.topicId,
    userId: item.userId,
    source: item.source,
    message: form.value.message,
    memo: form.value.userId,
  })
  item.showApplication = false
  item.closeApplyInfo = true
}

async function handleReject(item) {
  await client.declineContact({
    userId: item.userId,
    source: item.source,
    message: form.value.message,
    memo: form.value.memo,
  })
  item.showApplication = false
  item.closeApplyInfo = true
}
</script>

<template>
  <div class="relative flex h-screen w-full max-w-5xl flex-1  flex-col space-y-10 bg-slate-50 p-10">
    <div v-if="list" class="relative bg-white p-4">
      <h1 class="text-2xl font-semibold text-gray-800" style="white-space: nowrap">
        {{ !list.length ? 'No Friends Konck' : 'New Friend' }}
      </h1>
      <div v-for="item in list" :key="item">
        <ul v-if="!item.closeApplyInfo" class="mt-6 space-y-3 px-2 py-3 text-sm shadow-sm">
          <li>date:{{ item.createdAt }} </li>
          <li>topicId:{{ item.topicId }} </li>
          <li>ownerId:{{ item.ownerId }}</li>
          <li>source:{{ item.source }}</li>
          <li>message:{{ item.message }}</li>
          <li>from: {{ item.userId }}</li>
          <li>status:{{ item.status }}</li>
        </ul>
        <div v-if="!item.showApplication && !item.closeApplyInfo" class="mt-6 space-x-4">
          <Button type="primary" @click="handleApplication(item, 'accept')">
            Accept
          </Button>
          <Button @click="handleApplication(item)">
            Reject
          </Button>
        </div>

        <div v-if="item.showApplication" :dismissible="false" width="sm" :dismiss-button="false" class="z-50">
          <div class="mt-10 w-full space-y-4 text-sm font-semibold">
            <div class="flex w-2/3 items-center">
              message
              <Input v-model:value="form.message" placeholder="message" class="w-full pl-4" />
            </div>
            <div v-if="modal.showAcception" class="flex w-2/3 items-center">
              memo <Input v-model:value="form.memo" placeholder="memo" class="pl-4" />
            </div>
          </div>

          <div class="mt-10 flex justify-end space-x-4">
            <Button v-if="modal.showAcception" type="primary" @click="handleAccept(item)">
              Sure
            </Button>
            <Button v-else type="primary" @click="handleReject(item)">
              Reject
            </Button>
            <Button @click="item.showApplication = false">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
    <div v-else>
      <h1 class="text-2xl font-semibold text-gray-800">
        No New Notifications
      </h1>
    </div>
  </div>
</template>
