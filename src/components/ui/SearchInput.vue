<script setup>
import { ref } from 'vue'
import { MagnifyingGlassIcon } from '@heroicons/vue/24/outline'
import TInput from '../ui/Input.vue'

const props = defineProps({
    keyword: {
        type: String,
        required: true,
    },
    placeholder: String,
})
const emit = defineEmits(['update:keyword', 'search'])
const keyword = ref(props.keyword)

function handleSearch() {
    emit('update:keyword', keyword.value)
    emit('search')
}
</script>

<template>
  <TInput
    v-model:value="keyword"
    :placeholder="placeholder"
    @keyup.enter="handleSearch"
  >
    <template #prefix>
      <MagnifyingGlassIcon
        class="w-5 cursor-pointer text-lg text-gray-400
        hover:animate-pulse hover:text-indigo-500"
        aria-hidden="true" @click="handleSearch"
      />
    </template>
  </TInput>
</template>
