import type { ValidationResult } from '../types/app'
import type { EntityId, Participant, Presentation } from '../types/domain'

type IdFactory = () => EntityId

interface PresentationInput {
  title: string
  url: string
}

export function createParticipant(
  name: string,
  existingParticipants: readonly Participant[],
  createId: IdFactory = createEntityId,
): ValidationResult<Participant> {
  const validation = validateParticipantName(name, existingParticipants)

  if (!validation.success) {
    return validation
  }

  return success({
    id: createId(),
    name: validation.data,
    isActive: true,
    isUsed: false,
  })
}

export function createPresentation(
  input: PresentationInput,
  existingPresentations: readonly Presentation[],
  createId: IdFactory = createEntityId,
): ValidationResult<Presentation> {
  const validation = validatePresentationInput(input, existingPresentations)

  if (!validation.success) {
    return validation
  }

  return success({
    id: createId(),
    title: validation.data.title,
    url: validation.data.url,
    isActive: true,
    isUsed: false,
  })
}

export function validateParticipantName(
  name: string,
  existingParticipants: readonly Participant[],
  excludeId?: EntityId,
): ValidationResult<string> {
  const normalizedName = normalizeDisplayText(name)

  if (normalizedName.length === 0) {
    return failure('Skriv inn et navn.')
  }

  const duplicate = existingParticipants.find(
    (participant) =>
      participant.id !== excludeId &&
      normalizeLookupText(participant.name) === normalizeLookupText(normalizedName),
  )

  if (duplicate !== undefined) {
    return failure(`Deltakeren "${normalizedName}" finnes allerede.`)
  }

  return success(normalizedName)
}

export function validatePresentationInput(
  input: PresentationInput,
  existingPresentations: readonly Presentation[],
  excludeId?: EntityId,
): ValidationResult<PresentationInput> {
  const normalizedTitle = normalizeDisplayText(input.title)
  const normalizedUrl = input.url.trim()

  if (normalizedTitle.length === 0) {
    return failure('Skriv inn en tittel.')
  }

  if (normalizedUrl.length === 0) {
    return failure('Skriv inn en lenke.')
  }

  if (!isValidPresentationUrl(normalizedUrl)) {
    return failure('Lenken må starte med http:// eller https://.')
  }

  const duplicateTitle = existingPresentations.find(
    (presentation) =>
      presentation.id !== excludeId &&
      normalizeLookupText(presentation.title) === normalizeLookupText(normalizedTitle),
  )

  if (duplicateTitle !== undefined) {
    return failure(`Presentasjonen "${normalizedTitle}" finnes allerede.`)
  }

  const duplicateUrl = existingPresentations.find(
    (presentation) =>
      presentation.id !== excludeId &&
      normalizeUrlForLookup(presentation.url) === normalizeUrlForLookup(normalizedUrl),
  )

  if (duplicateUrl !== undefined) {
    return failure('Denne lenken brukes allerede av en annen presentasjon.')
  }

  return success({
    title: normalizedTitle,
    url: normalizedUrl,
  })
}

export function parseParticipantBulkInput(
  input: string,
  existingParticipants: readonly Participant[],
  createId: IdFactory = createEntityId,
): ValidationResult<Participant[]> {
  const existingNames = new Set(
    existingParticipants.map((participant) => normalizeLookupText(participant.name)),
  )

  const seenNames = new Set<string>()
  const createdParticipants: Participant[] = []
  const errors: string[] = []

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const trimmedLine = rawLine.trim()

    if (trimmedLine.length === 0) {
      return
    }

    const normalizedName = normalizeDisplayText(trimmedLine)
    const lookupName = normalizeLookupText(normalizedName)

    if (normalizedName.length === 0) {
      errors.push(`Linje ${lineNumber}: Navnet kan ikke være tomt.`)
      return
    }

    if (existingNames.has(lookupName)) {
      errors.push(`Linje ${lineNumber}: Deltakeren "${normalizedName}" finnes allerede.`)
      return
    }

    if (seenNames.has(lookupName)) {
      errors.push(`Linje ${lineNumber}: Deltakeren "${normalizedName}" er duplisert i listen.`)
      return
    }

    seenNames.add(lookupName)
    createdParticipants.push({
      id: createId(),
      name: normalizedName,
      isActive: true,
      isUsed: false,
    })
  })

  if (createdParticipants.length === 0 && errors.length === 0) {
    errors.push('Legg inn minst ett navn.')
  }

  if (errors.length > 0) {
    return failure(...errors)
  }

  return success(createdParticipants)
}

export function parsePresentationBulkInput(
  input: string,
  existingPresentations: readonly Presentation[],
  createId: IdFactory = createEntityId,
): ValidationResult<Presentation[]> {
  const existingTitles = new Set(
    existingPresentations.map((presentation) => normalizeLookupText(presentation.title)),
  )
  const existingUrls = new Set(
    existingPresentations.map((presentation) => normalizeUrlForLookup(presentation.url)),
  )

  const seenTitles = new Set<string>()
  const seenUrls = new Set<string>()
  const createdPresentations: Presentation[] = []
  const errors: string[] = []

  input.split(/\r?\n/).forEach((rawLine, index) => {
    const lineNumber = index + 1
    const trimmedLine = rawLine.trim()

    if (trimmedLine.length === 0) {
      return
    }

    const separatorIndex = trimmedLine.indexOf('|')

    if (separatorIndex === -1 || separatorIndex !== trimmedLine.lastIndexOf('|')) {
      errors.push(`Linje ${lineNumber}: Bruk formatet "Tittel | URL".`)
      return
    }

    const title = normalizeDisplayText(trimmedLine.slice(0, separatorIndex))
    const url = trimmedLine.slice(separatorIndex + 1).trim()
    const titleLookup = normalizeLookupText(title)
    const urlLookup = normalizeUrlForLookup(url)

    if (title.length === 0) {
      errors.push(`Linje ${lineNumber}: Tittelen kan ikke være tom.`)
      return
    }

    if (url.length === 0) {
      errors.push(`Linje ${lineNumber}: Lenken kan ikke være tom.`)
      return
    }

    if (!isValidPresentationUrl(url)) {
      errors.push(`Linje ${lineNumber}: Lenken må starte med http:// eller https://.`)
      return
    }

    if (existingTitles.has(titleLookup)) {
      errors.push(`Linje ${lineNumber}: Presentasjonen "${title}" finnes allerede.`)
      return
    }

    if (seenTitles.has(titleLookup)) {
      errors.push(`Linje ${lineNumber}: Presentasjonen "${title}" er duplisert i listen.`)
      return
    }

    if (existingUrls.has(urlLookup)) {
      errors.push(`Linje ${lineNumber}: Lenken brukes allerede av en annen presentasjon.`)
      return
    }

    if (seenUrls.has(urlLookup)) {
      errors.push(`Linje ${lineNumber}: Den samme lenken er brukt flere ganger i listen.`)
      return
    }

    seenTitles.add(titleLookup)
    seenUrls.add(urlLookup)
    createdPresentations.push({
      id: createId(),
      title,
      url,
      isActive: true,
      isUsed: false,
    })
  })

  if (createdPresentations.length === 0 && errors.length === 0) {
    errors.push('Legg inn minst én presentasjon.')
  }

  if (errors.length > 0) {
    return failure(...errors)
  }

  return success(createdPresentations)
}

export function isValidPresentationUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function createEntityId(): EntityId {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID()
  }

  return `entity-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeDisplayText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeLookupText(value: string): string {
  return normalizeDisplayText(value).toLocaleLowerCase()
}

function normalizeUrlForLookup(url: string): string {
  return url.trim().toLocaleLowerCase()
}

function success<T>(data: T): ValidationResult<T> {
  return {
    success: true,
    data,
  }
}

function failure<T = never>(...errors: string[]): ValidationResult<T> {
  return {
    success: false,
    errors,
  }
}
