<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
    value: {
        type: String,
        required: true,
    },
    placeholder: {
        type: String,
        default: 'Please Input',
    },
    type: {
        type: String,
        default: 'text',
    },
    pointerEvents: {
        type: String,
        default: 'pointer-events-none',
    },
    disabled: {
        type: Boolean,
        default: false,
    },
    /**
   * validate: () => true,
   * message: 'error',
   * time: 0,
   */
    rule: {
        type: Object,
        default: () => {},
    },
})

const emits = defineEmits(['update:value', 'onKeyUpEnter'])

const value = ref(props.value)
watch(() => props.value, val => value.value = val)

const showErr = ref(false)

function validate(fn) {
    if (props.rule) {
        if (props.rule.validate()) {
            fn(null)
            showErr.value = false
        }
        else {
            fn(true)
            showErr.value = true
            if (props.rule.time) {
                setTimeout(() => {
                    showErr.value = false
                }, props.rule.time)
            }
        }
    }
}

function onUpdateValue() {
    emits('update:value', value.value)
    validate(() => {})
}

const errClass = computed(() => showErr.value && 'border border-red-500')

// 把validate 暴露出去
defineExpose({ validate })
</script>

<template>
  <div class="w-full">
    <!-- <label for="email" class="block text-sm font-medium text-gray-700">Email</label> -->
    <div class="relative">
      <div class="relative rounded-md">
        <div
          v-if="$slots.prefix"
          class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"
        >
          <slot name="prefix" />
        </div>
        <div>
          <input
            v-model="value"
            :type="type"
            :placeholder="placeholder"
            :disabled="disabled"
            class="block w-full rounded-md border border-gray-300 py-1.5 text-sm placeholder:text-xs placeholder:text-gray-400
           focus:border-indigo-500 focus:bg-white focus:text-gray-900 focus:outline-none
            focus:ring-indigo-500 focus:placeholder:text-gray-500 sm:text-sm"
            :class="[`${$slots.prefix ? 'pl-10' : 'pl-3'}`, `${$slots.suffix ? 'pr-10' : 'pr-3'}`, errClass]"
            @keyup.enter="$emit('onKeyUpEnter')"
            @change="onUpdateValue"
            @blur="onUpdateValue"
          >
          <div v-if="showErr" class="absolute top-9 text-xs text-red-500 sm:ml-2 sm:text-sm">
            {{ rule?.message }}
          </div>
        </div>
        <div
          v-if="$slots.suffix"
          class="absolute inset-y-0 right-0 flex items-center pr-3"
          :class="pointerEvents"
        >
          <slot name="suffix" />
        </div>
      </div>
    </div>
  </div>
</template>
