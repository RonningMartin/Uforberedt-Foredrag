import { describe, expect, it } from 'vitest'

import { createInitialAppState } from '../state/appState'
import { validateAppState } from '../utils/dataValidation'
import { readStoredState, writeStoredState } from './useLocalStorage'
import type { StorageLike } from './useLocalStorage'

class MemoryStorage implements StorageLike {
  private readonly storage = new Map<string, string>()

  getItem(key: string) {
    return this.storage.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.storage.set(key, value)
  }

  removeItem(key: string) {
    this.storage.delete(key)
  }
}

describe('readStoredState', () => {
  it('returns an empty initial state when nothing has been stored', () => {
    const storage = new MemoryStorage()
    const result = readStoredState({
      storageKey: 'app',
      storage,
      createInitialState: createInitialAppState,
      validate: validateAppState,
    })

    expect(result.status).toBe('empty')
    expect(result.state).toEqual(createInitialAppState())
  })

  it('restores a previously saved valid state', () => {
    const storage = new MemoryStorage()
    const initialState = createInitialAppState()
    const validState = {
      ...initialState,
      activeView: 'history' as const,
      participants: [
        {
          id: 'participant-1',
          name: 'Ada',
          isActive: true,
          isUsed: false,
        },
      ],
    }

    writeStoredState('app', validState, storage)

    const result = readStoredState({
      storageKey: 'app',
      storage,
      createInitialState: createInitialAppState,
      validate: validateAppState,
    })

    expect(result.status).toBe('loaded')
    expect(result.state).toEqual(validState)
  })

  it('loads older solo state without teammate fields and maps it to the new round model', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'app',
      JSON.stringify({
        version: 1,
        activeView: 'history',
        participants: [
          {
            id: 'participant-1',
            name: 'Ada',
            isActive: true,
            isUsed: true,
          },
        ],
        presentations: [
          {
            id: 'presentation-1',
            title: 'Romfart',
            url: 'https://example.com/romfart',
            isActive: true,
            isUsed: true,
          },
        ],
        history: [
          {
            id: 'history-1',
            roundNumber: 1,
            participantId: 'participant-1',
            participantName: 'Ada',
            presentationId: 'presentation-1',
            presentationTitle: 'Romfart',
            presentationUrl: 'https://example.com/romfart',
            completedAt: '2026-07-30T10:05:00.000Z',
          },
        ],
        currentRound: {
          id: 'round-1',
          step: 'complete',
          participantId: 'participant-1',
          participantName: 'Ada',
          presentationId: 'presentation-1',
          presentationTitle: 'Romfart',
          presentationUrl: 'https://example.com/romfart',
          historyEntryId: 'history-1',
          startedAt: '2026-07-30T10:00:00.000Z',
        },
        settings: {
          automaticPresentationOpen: true,
        },
      }),
    )

    const result = readStoredState({
      storageKey: 'app',
      storage,
      createInitialState: createInitialAppState,
      validate: validateAppState,
    })

    expect(result.status).toBe('loaded')
    expect(result.state.history[0]).toMatchObject({
      primaryParticipantId: 'participant-1',
      primaryParticipantName: 'Ada',
      teammateParticipantId: null,
      teammateParticipantName: null,
    })
    expect(result.state.currentRound).toMatchObject({
      step: 'complete',
      primaryParticipantId: 'participant-1',
      primaryParticipantName: 'Ada',
      teammateParticipantId: null,
      teammateParticipantName: null,
    })
  })

  it('recovers from malformed JSON and returns a clean fallback', () => {
    const storage = new MemoryStorage()
    storage.setItem('app', '{this is invalid json')

    const result = readStoredState({
      storageKey: 'app',
      storage,
      createInitialState: createInitialAppState,
      validate: validateAppState,
    })

    expect(result.status).toBe('recovered')
    expect(result.state).toEqual(createInitialAppState())
    expect(storage.getItem('app')).toBeNull()
  })

  it('rejects structurally invalid stored state and resets it', () => {
    const storage = new MemoryStorage()
    storage.setItem(
      'app',
      JSON.stringify({
        version: 999,
        activeView: 'missing',
        participants: [],
        presentations: [],
        history: [],
        currentRound: null,
        settings: {},
      }),
    )

    const result = readStoredState({
      storageKey: 'app',
      storage,
      createInitialState: createInitialAppState,
      validate: validateAppState,
    })

    expect(result.status).toBe('recovered')
    expect(result.state).toEqual(createInitialAppState())
    expect(storage.getItem('app')).toBeNull()
  })
})
