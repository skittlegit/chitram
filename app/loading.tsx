export default function Loading() {
  return (
    <main className="loading-page" aria-busy="true" aria-label="Loading Chitram">
      <div className="loading-header"><span className="wordmark">Chitram</span><i /></div>
      <div className="loading-stage">
        <div className="loading-copy"><i /><i /><i /><i /></div>
        <div className="loading-poster"><span>Loading today&apos;s show</span></div>
      </div>
    </main>
  );
}
