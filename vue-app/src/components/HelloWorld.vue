<script setup lang="ts">
import viteLogo from '../assets/vite.svg'
import vueLogo from '../assets/vue.svg'
</script>

<template>
  <main class="hello-world">
    <div class="logo-wrapper">
      <img :src="viteLogo" alt="Vite logo" class="logo" />
      <img :src="vueLogo" alt="Vue logo" class="logo" />
    </div>
    <h1>Hello World</h1>
    <p class="subtitle">Vue 3 · Vite 8 · TypeScript</p>
    <div class="badges">
      <span class="badge">Vue</span>
      <span class="badge">Vite&nbsp;8</span>
      <span class="badge">OXC</span>
      <span class="badge">oxlint</span>
      <span class="badge">oxfmt</span>
    </div>
  </main>
</template>

<style scoped>
.hello-world {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  text-align: center;
  padding: 2rem 2rem 4rem;
}

.logo-wrapper {
  display: flex;
  gap: 1rem;
}

.logo {
  width: 64px;
  height: 64px;
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
  color: #41b883;
  margin: 0;
}

.subtitle {
  font-size: 1rem;
  color: #666;
  margin: 0;
}

.badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.badge {
  background: rgba(65, 184, 131, 0.12);
  border: 1px solid rgba(65, 184, 131, 0.35);
  color: #41b883;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  font-weight: 600;
}
</style>
