import { createSeedData } from './data.seed'
import type { AppData, PendingChange } from './types'

const STORAGE_KEY = 'ifarma_demo_state_v1'

export const loadData = (): AppData => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const seeded = createSeedData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
  try {
    return JSON.parse(raw) as AppData
  } catch {
    const seeded = createSeedData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
    return seeded
  }
}

export const saveData = (data: AppData) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export const resetData = (): AppData => {
  const seeded = createSeedData()
  saveData(seeded)
  return seeded
}

export const queueChange = (
  queue: PendingChange[],
  change: Omit<PendingChange, 'id' | 'createdAt' | 'synced'>,
): PendingChange[] => [
  ...queue,
  {
    id: `pending-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    synced: false,
    ...change,
  },
]
