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

export interface Penalty {
  id: EntityId
  title: string
  description: string | null
  isActive: boolean
  isUsed: boolean
  createdAt: string
}

export type RoundStep =
  | 'participant'
  | 'teammate'
  | 'presentation'
  | 'confirm'
  | 'complete'
  | 'penalty'

export interface DraftRound {
  id: EntityId
  step: RoundStep
  primaryParticipantId: EntityId | null
  primaryParticipantName: string | null
  teammateParticipantId: EntityId | null
  teammateParticipantName: string | null
  presentationId: EntityId | null
  presentationTitle: string | null
  presentationUrl: string | null
  penaltyId: EntityId | null
  penaltyTitle: string | null
  penaltyDescription: string | null
  historyEntryId: EntityId | null
  startedAt: string
}

export interface RoundHistoryEntry {
  id: EntityId
  roundNumber: number
  primaryParticipantId: EntityId
  primaryParticipantName: string
  teammateParticipantId: EntityId | null
  teammateParticipantName: string | null
  presentationId: EntityId
  presentationTitle: string
  presentationUrl: string
  penaltyId: EntityId | null
  penaltyTitle: string | null
  penaltyDescription: string | null
  completedAt: string
}

export interface AppSettings {
  automaticPresentationOpen: boolean
}
