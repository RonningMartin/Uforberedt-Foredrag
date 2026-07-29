interface RoundResultProps {
  label: string
  value: string
  secondary?: string | null
}

function RoundResult({ label, value, secondary }: RoundResultProps) {
  return (
    <div className="round-result">
      <p className="round-result__label">{label}</p>
      <strong>{value}</strong>
      {secondary ? <p className="round-result__secondary">{secondary}</p> : null}
    </div>
  )
}

export default RoundResult
