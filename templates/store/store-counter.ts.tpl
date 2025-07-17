import { defineStore, acceptHMRUpdate } from 'pinia'

export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 as number }),
  actions: {
    increment() { this.count++ },
  },
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCounterStore, import.meta.hot))
}