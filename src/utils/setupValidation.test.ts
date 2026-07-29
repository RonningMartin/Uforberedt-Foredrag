import { describe, expect, it } from 'vitest'

import {
  createParticipant,
  createPresentation,
  parseParticipantBulkInput,
  parsePresentationBulkInput,
  validateParticipantName,
  validatePresentationInput,
} from './setupValidation'

describe('setupValidation', () => {
  it('creates a participant from a valid single name', () => {
    const result = createParticipant('  Ada Lovelace  ', [], () => 'participant-1')

    expect(result).toEqual({
      success: true,
      data: {
        id: 'participant-1',
        name: 'Ada Lovelace',
        isActive: true,
        isUsed: false,
      },
    })
  })

  it('rejects duplicate participant names when adding or editing', () => {
    const participants = [
      {
        id: 'participant-1',
        name: 'Ada',
        isActive: true,
        isUsed: false,
      },
    ]

    expect(createParticipant('Ada', participants, () => 'participant-2')).toEqual({
      success: false,
      errors: ['Deltakeren "Ada" finnes allerede.'],
    })

    expect(validateParticipantName('Ada', participants, 'participant-1')).toEqual({
      success: true,
      data: 'Ada',
    })
  })

  it('rejects participant bulk input without partially creating entries', () => {
    const result = parseParticipantBulkInput('Ada\nAda\nGrace', [], () => 'participant')

    expect(result.success).toBe(false)
    expect(result).toEqual({
      success: false,
      errors: ['Linje 2: Deltakeren "Ada" er duplisert i listen.'],
    })
  })

  it('creates presentations from valid title and http or https url', () => {
    const result = createPresentation(
      {
        title: 'Romfart',
        url: 'http://example.com/rom',
      },
      [],
      () => 'presentation-1',
    )

    expect(result).toEqual({
      success: true,
      data: {
        id: 'presentation-1',
        title: 'Romfart',
        url: 'http://example.com/rom',
        isActive: true,
        isUsed: false,
      },
    })
  })

  it('rejects invalid presentation input and duplicate data', () => {
    const presentations = [
      {
        id: 'presentation-1',
        title: 'Romfart',
        url: 'https://example.com/rom',
        isActive: true,
        isUsed: false,
      },
    ]

    expect(
      validatePresentationInput(
        {
          title: 'Ny tittel',
          url: 'ftp://example.com/invalid',
        },
        presentations,
      ),
    ).toEqual({
      success: false,
      errors: ['Lenken må starte med http:// eller https://.'],
    })

    expect(
      validatePresentationInput(
        {
          title: 'Romfart',
          url: 'https://example.com/ny',
        },
        presentations,
      ),
    ).toEqual({
      success: false,
      errors: ['Presentasjonen "Romfart" finnes allerede.'],
    })
  })

  it('rejects invalid presentation bulk input without partial saves', () => {
    const result = parsePresentationBulkInput(
      'Romfart | https://example.com/rom\nUgyldig linje\nKatter | https://example.com/katter',
      [],
      () => 'presentation',
    )

    expect(result.success).toBe(false)
    expect(result).toEqual({
      success: false,
      errors: ['Linje 2: Bruk formatet "Tittel | URL".'],
    })
  })
})
