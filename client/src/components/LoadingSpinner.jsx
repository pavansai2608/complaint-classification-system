// Shown while data is being fetched.
function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="loading-spinner" role="status">
      <span className="loading-spinner-ring" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

export default LoadingSpinner
