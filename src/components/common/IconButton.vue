<script setup>
defineProps({
  icon: { type: String, required: true },
  title: { type: String, default: '' },
  separator: { type: Boolean, default: false }
})

defineEmits(['click'])
</script>

<template>
  <div v-if="separator" class="icon-separator"></div>
  <button
    v-else
    class="icon-button"
    :title="title"
    @click="$emit('click')"
  >
    <span class="icon">{{ icon }}</span>
  </button>
</template>

<style scoped>
.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 30px;
  padding: 0 4px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
  white-space: nowrap;
  overflow: hidden;
}

.icon-button:hover {
  background-color: var(--color-toolbar-hover);
  color: var(--color-text);
}

.icon-button:active {
  background-color: var(--color-toolbar-active);
}

.icon {
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
}

.icon-separator {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background-color: var(--color-border);
  flex-shrink: 0;
}
</style>
