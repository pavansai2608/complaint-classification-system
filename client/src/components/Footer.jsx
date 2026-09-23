function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <span>
        &copy; {year} Complaint Resolution System
      </span>
    </footer>
  )
}

export default Footer
