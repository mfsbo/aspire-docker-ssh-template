<script setup lang="ts">
import { formatBuildDate, getBuildYear } from '@aspire-template/shared-utils/Date'
import APP_INFO from '../app-info'

const buildDate = formatBuildDate(new Date(APP_INFO.buildTime))
const year = getBuildYear(new Date(APP_INFO.buildTime))
</script>

<template>
  <footer class="app-footer">
    <span>{{ APP_INFO.appName }} &nbsp;v{{ APP_INFO.version }}</span>
    <span class="separator">|</span>
    <span>Built {{ buildDate }}</span>
    <span class="separator">|</span>
    <span>© {{ year }}</span>
  </footer>
</template>

<style scoped>
.app-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(15, 15, 26, 0.9);
  border-top: 1px solid rgba(81, 43, 212, 0.3);
  font-size: 0.75rem;
  color: #a0a0b0;
  backdrop-filter: blur(6px);
}

.separator {
  opacity: 0.4;
}
</style>
