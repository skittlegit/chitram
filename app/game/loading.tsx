export default function GameLoading() {
  return (
    <main className="play-page play-loading-page" aria-busy="true" aria-label="Loading today’s game">
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand wordmark">Chitram</span>
        </div>
      </header>

      <section className="play-stage play-loading-stage">
        <div className="play-loading-options" />
        <div className="play-loading-title">
          <div><i /><strong /></div>
          <span />
        </div>
        <div className="play-loading-progress" />
        <div className="play-loading-search"><i /><span /></div>
        <div className="play-loading-workspace">
          <div className="play-loading-board"><i /><span /></div>
          <div className="play-loading-clues"><i /><span /><span /></div>
        </div>
      </section>
    </main>
  );
}
