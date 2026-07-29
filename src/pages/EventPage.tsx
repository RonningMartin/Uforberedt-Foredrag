function EventPage() {
  return (
    <section className="panel panel--narrow">
      <div className="panel-heading">
        <div>
          <p className="section-label">Event</p>
          <h2>Arrangementssiden</h2>
        </div>
      </div>

      <div className="event-placeholder" aria-hidden="true">
        <div className="event-placeholder__wheel" />
      </div>

      <p className="placeholder-copy">
        Her kommer trekningen av deltakere og presentasjoner når arrangementet starter.
      </p>
    </section>
  )
}

export default EventPage
