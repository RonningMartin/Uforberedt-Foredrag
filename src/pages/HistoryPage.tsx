interface HistoryPageProps {
  historyCount: number
}

function HistoryPage({ historyCount }: HistoryPageProps) {
  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Historikk</p>
          <h2>Gjennomførte runder</h2>
        </div>
        <p className="status-line">{formatCount(historyCount, 'runde', 'runder')} lagret</p>
      </div>

      <div className="history-placeholder" role="presentation">
        <div className="history-placeholder__head">
          <span>Runde</span>
          <span>Deltaker</span>
          <span>Presentasjon</span>
        </div>
        <p className="placeholder-copy">Bekreftede runder vises her når arrangementet er i gang.</p>
      </div>
    </section>
  )
}

function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`
}

export default HistoryPage
