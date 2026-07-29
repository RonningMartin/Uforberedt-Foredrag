export type EntityId = string

export interface Participant {
  id: EntityId
  name: string
  isActive: boolean
  isUsed: boolean
}

export interface Presentation {
  id: EntityId
  title: string
  url: string
  isActive: boolean
  isUsed: boolean
}

export type RoundStep = 'participant' | 'presentation' | 'confirm' | 'complete'

export interface DraftRound {
  id: EntityId
  step: RoundStep
  participantId: EntityId | null
  participantName: string | null
  presentationId: EntityId | null
  presentationTitle: string | null
  presentationUrl: string | null
  historyEntryId: EntityId | null
  startedAt: string
}

export interface RoundHistoryEntry {
  id: EntityId
  roundNumber: number
  participantId: EntityId
  participantName: string
  presentationId: EntityId
  presentationTitle: string
  presentationUrl: string
  completedAt: string
}

export interface AppSettings {
  automaticPresentationOpen: boolean
}
