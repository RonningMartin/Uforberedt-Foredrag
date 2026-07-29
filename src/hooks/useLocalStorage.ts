import { useEffect, useReducer, useRef } from 'react'
import type { Dispatch, Reducer } from 'react'

import type { StorageHydration, ValidationResult } from '../types/app'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

interface ReadStoredStateOptions<T> {
  storageKey: string
  createInitialState: () => T
  validate: (value: unknown) => ValidationResult<T>
  storage?: StorageLike | null
}

interface UseLocalStorageReducerOptions<State, Action> extends ReadStoredStateOptions<State> {
  reducer: Reducer<State, Action>
}

interface UseLocalStorageReducerResult<State, Action> {
  state: State
  dispatch: Dispatch<Action>
  hydration: StorageHydration<State>
}

export function useLocalStorageReducer<State, Action>(
  options: UseLocalStorageReducerOptions<State, Action>,
): UseLocalStorageReducerResult<State, Action> {
  const hydrationRef = useRef<StorageHydration<State> | null>(null)

  if (hydrationRef.current === null) {
    hydrationRef.current = readStoredState(options)
  }

  const [state, dispatch] = useReducer(options.reducer, hydrationRef.current.state)

  useEffect(() => {
    writeStoredState(options.storageKey, state, options.storage)
  }, [options.storage, options.storageKey, state])

  return {
    state,
    dispatch,
    hydration: hydrationRef.current,
  }
}

export function readStoredState<T>(options: ReadStoredStateOptions<T>): StorageHydration<T> {
  const storage = resolveStorage(options.storage)
  const fallbackState = options.createInitialState()

  if (storage === null) {
    return {
      state: fallbackState,
      status: 'unavailable',
      message: 'Nettleseren tillater ikke lokal lagring i denne konteksten.',
    }
  }

  const rawValue = storage.getItem(options.storageKey)

  if (rawValue === null) {
    return {
      state: fallbackState,
      status: 'empty',
      message: 'Ingen lagret state ble funnet ennå.',
    }
  }

  try {
    const parsedValue: unknown = JSON.parse(rawValue)
    const validation = options.validate(parsedValue)

    if (!validation.success) {
      safeRemoveItem(storage, options.storageKey)

      return {
        state: fallbackState,
        status: 'recovered',
        message: 'Lagret state hadde ugyldig struktur og ble nullstilt.',
      }
    }

    return {
      state: validation.data,
      status: 'loaded',
      message: 'Lagret state ble gjenopprettet fra localStorage.',
    }
  } catch {
    safeRemoveItem(storage, options.storageKey)

    return {
      state: fallbackState,
      status: 'recovered',
      message: 'Lagret state kunne ikke tolkes og ble nullstilt.',
    }
  }
}

export function writeStoredState<T>(
  storageKey: string,
  state: T,
  storageOverride?: StorageLike | null,
): boolean {
  const storage = resolveStorage(storageOverride)

  if (storage === null) {
    return false
  }

  try {
    storage.setItem(storageKey, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}

function resolveStorage(storageOverride?: StorageLike | null): StorageLike | null {
  if (storageOverride !== undefined) {
    return storageOverride
  }

  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeRemoveItem(storage: StorageLike, storageKey: string) {
  try {
    storage.removeItem(storageKey)
  } catch {
    return
  }
}
