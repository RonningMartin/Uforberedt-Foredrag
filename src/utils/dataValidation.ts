import { APP_STATE_VERSION } from '../state/appState'
import type { AppState, AppView, ValidationResult } from '../types/app'
import type {
  AppSettings,
  DraftRound,
  Participant,
  Presentation,
  RoundHistoryEntry,
  RoundStep,
} from '../types/domain'

type UnknownRecord = Record<string, unknown>

const validViews: readonly AppView[] = ['setup', 'event', 'history']
const validRoundSteps: readonly RoundStep[] = ['participant', 'presentation', 'confirm', 'complete']

export function validateAppState(value: unknown): ValidationResult<AppState> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return {
      success: false,
      errors: ['App state må være et objekt.'],
    }
  }

  const version = readVersion(value.version, 'version', errors)
  const activeView = readView(value.activeView, 'activeView', errors)
  const participants = readArray(value.participants, 'participants', validateParticipant, errors)
  const presentations = readArray(
    value.presentations,
    'presentations',
    validatePresentation,
    errors,
  )
  const history = readArray(value.history, 'history', validateHistoryEntry, errors)
  const currentRound = readNullableObject(
    value.currentRound,
    'currentRound',
    validateDraftRound,
    errors,
  )
  const settings = readObject(value.settings, 'settings', validateSettings, errors)

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    }
  }

  return {
    success: true,
    data: {
      version,
      activeView,
      participants,
      presentations,
      history,
      currentRound,
      settings,
    },
  }
}

function validateParticipant(value: unknown, path: string): ValidationResult<Participant> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return failure(`${path} må være et objekt.`)
  }

  const id = readString(value.id, `${path}.id`, errors)
  const name = readString(value.name, `${path}.name`, errors)
  const isActive = readBoolean(value.isActive, `${path}.isActive`, errors)
  const isUsed = readBoolean(value.isUsed, `${path}.isUsed`, errors)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      id,
      name,
      isActive,
      isUsed,
    },
  }
}

function validatePresentation(value: unknown, path: string): ValidationResult<Presentation> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return failure(`${path} må være et objekt.`)
  }

  const id = readString(value.id, `${path}.id`, errors)
  const title = readString(value.title, `${path}.title`, errors)
  const url = readString(value.url, `${path}.url`, errors)
  const isActive = readBoolean(value.isActive, `${path}.isActive`, errors)
  const isUsed = readBoolean(value.isUsed, `${path}.isUsed`, errors)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      id,
      title,
      url,
      isActive,
      isUsed,
    },
  }
}

function validateHistoryEntry(value: unknown, path: string): ValidationResult<RoundHistoryEntry> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return failure(`${path} må være et objekt.`)
  }

  const id = readString(value.id, `${path}.id`, errors)
  const roundNumber = readPositiveInteger(value.roundNumber, `${path}.roundNumber`, errors)
  const participantId = readString(value.participantId, `${path}.participantId`, errors)
  const participantName = readString(value.participantName, `${path}.participantName`, errors)
  const presentationId = readString(value.presentationId, `${path}.presentationId`, errors)
  const presentationTitle = readString(value.presentationTitle, `${path}.presentationTitle`, errors)
  const presentationUrl = readString(value.presentationUrl, `${path}.presentationUrl`, errors)
  const completedAt = readString(value.completedAt, `${path}.completedAt`, errors)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      id,
      roundNumber,
      participantId,
      participantName,
      presentationId,
      presentationTitle,
      presentationUrl,
      completedAt,
    },
  }
}

function validateDraftRound(value: unknown, path: string): ValidationResult<DraftRound> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return failure(`${path} må være et objekt.`)
  }

  const id = readString(value.id, `${path}.id`, errors)
  const step = readRoundStep(value.step, `${path}.step`, errors)
  const participantId = readNullableString(value.participantId, `${path}.participantId`, errors)
  const presentationId = readNullableString(
    value.presentationId,
    `${path}.presentationId`,
    errors,
  )
  const startedAt = readString(value.startedAt, `${path}.startedAt`, errors)

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      id,
      step,
      participantId,
      presentationId,
      startedAt,
    },
  }
}

function validateSettings(value: unknown, path: string): ValidationResult<AppSettings> {
  const errors: string[] = []

  if (!isRecord(value)) {
    return failure(`${path} må være et objekt.`)
  }

  const automaticPresentationOpen = readBoolean(
    value.automaticPresentationOpen,
    `${path}.automaticPresentationOpen`,
    errors,
  )

  if (errors.length > 0) {
    return { success: false, errors }
  }

  return {
    success: true,
    data: {
      automaticPresentationOpen,
    },
  }
}

function readArray<T>(
  value: unknown,
  path: string,
  validateItem: (item: unknown, itemPath: string) => ValidationResult<T>,
  errors: string[],
): T[] {
  if (!Array.isArray(value)) {
    errors.push(`${path} må være en liste.`)
    return []
  }

  const items: T[] = []

  value.forEach((item, index) => {
    const result = validateItem(item, `${path}[${index}]`)

    if (!result.success) {
      errors.push(...result.errors)
      return
    }

    items.push(result.data)
  })

  return items
}

function readObject<T>(
  value: unknown,
  path: string,
  validateObject: (item: unknown, itemPath: string) => ValidationResult<T>,
  errors: string[],
): T {
  const result = validateObject(value, path)

  if (!result.success) {
    errors.push(...result.errors)
    return {} as T
  }

  return result.data
}

function readNullableObject<T>(
  value: unknown,
  path: string,
  validateObject: (item: unknown, itemPath: string) => ValidationResult<T>,
  errors: string[],
): T | null {
  if (value === null) {
    return null
  }

  const result = validateObject(value, path)

  if (!result.success) {
    errors.push(...result.errors)
    return null
  }

  return result.data
}

function readVersion(value: unknown, path: string, errors: string[]): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    errors.push(`${path} må være et heltall.`)
    return APP_STATE_VERSION
  }

  if (value !== APP_STATE_VERSION) {
    errors.push(`${path} må være ${APP_STATE_VERSION}.`)
    return APP_STATE_VERSION
  }

  return value
}

function readView(value: unknown, path: string, errors: string[]): AppView {
  if (typeof value !== 'string' || !validViews.includes(value as AppView)) {
    errors.push(`${path} må være en gyldig visning.`)
    return 'setup'
  }

  return value as AppView
}

function readRoundStep(value: unknown, path: string, errors: string[]): RoundStep {
  if (typeof value !== 'string' || !validRoundSteps.includes(value as RoundStep)) {
    errors.push(`${path} må være et gyldig runde-steg.`)
    return 'participant'
  }

  return value as RoundStep
}

function readString(value: unknown, path: string, errors: string[]): string {
  if (typeof value !== 'string') {
    errors.push(`${path} må være en tekststreng.`)
    return ''
  }

  return value
}

function readNullableString(value: unknown, path: string, errors: string[]): string | null {
  if (value === null) {
    return null
  }

  return readString(value, path, errors)
}

function readBoolean(value: unknown, path: string, errors: string[]): boolean {
  if (typeof value !== 'boolean') {
    errors.push(`${path} må være true eller false.`)
    return false
  }

  return value
}

function readPositiveInteger(value: unknown, path: string, errors: string[]): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    errors.push(`${path} må være et positivt heltall.`)
    return 1
  }

  return value
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure(message: string): ValidationResult<never> {
  return {
    success: false,
    errors: [message],
  }
}
