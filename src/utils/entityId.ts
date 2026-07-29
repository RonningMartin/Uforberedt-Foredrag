import type { EntityId } from '../types/domain'

export function createEntityId(): EntityId {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `entity-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
