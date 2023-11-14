<script setup>
import { ref } from 'vue'

import {
    CalendarIcon,
} from '@heroicons/vue/24/outline'

// import Loading from './Loading.vue'
const props = defineProps(['tabs', 'current'])
const emits = defineEmits(['select'])

const currentTab = ref(props.current ? props.current : 0)
function select(idx) {
    currentTab.value = idx
    emits('select', idx)
}
</script>

<template>
  <div class="md:hidden">
    <label for="selected-tab" class="sr-only">Select a tab</label>
    <select
      id="selected-tab" name="selected-tab"
      class="mt-1 block  w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      @change="(e) => select(e.target.value)"
    >
      <option v-for="(tab, idx) in tabs" :key="tab.name" :value="idx" :selected="currentTab === idx">
        {{
          tab.name
        }}
      </option>
    </select>
  </div>
  <div class="flex space-x-8">
    <div class="hidden md:block">
      <div class="border-b border-gray-200">
        <nav class="-mb-px flex flex-col space-y-4">
          <a
            v-for="(tab, idx) in tabs" :key="tab.name" href="#" class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium" :class="[currentTab === idx ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700']"
            @click="select(idx)"
          >

            <!-- <a :href="item.href" class="flex" :class="[item.current ? 'bg-gray-50 text-indigo-600' : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50', 'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold']"> -->
            <CalendarIcon class="h-6 w-6" />
            <!-- <component :is="item.icon" :class="[item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600', 'h-6 w-6 shrink-0']" aria-hidden="true" /> -->
            <div>
              <div class="flex justify-between">
                <p>{{ tab.name }}</p>
                <p class="text-xs font-light">18:00</p>
              </div>
              <p class="w-48 truncate text-sm font-normal">you are welcome ! you are welcome !</p>
            </div>
          </a>
        <!-- </a> -->
        </nav>
      </div>
    </div>
    <div class="pt-4">
      <div>{{ tabs[currentTab].content }}</div>
    </div>
  </div>
</template>
