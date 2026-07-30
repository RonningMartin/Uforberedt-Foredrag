export function formatTeamName(
  primaryParticipantName: string | null,
  teammateParticipantName: string | null,
): string {
  if (primaryParticipantName === null) {
    return 'Ukjent deltaker'
  }

  if (teammateParticipantName === null) {
    return primaryParticipantName
  }

  return `${primaryParticipantName} + ${teammateParticipantName}`
}

export function getTeamLabel(teammateParticipantName: string | null): string {
  return teammateParticipantName === null ? 'Deltaker' : 'Lag'
}
