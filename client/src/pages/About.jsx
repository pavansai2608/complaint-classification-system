import { Link } from 'react-router-dom'

// Public page: explains what the app does. It is fixed text, no data is loaded.
function About() {
  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </Link>
      </header>

      <main className="home-hero about-page">
        <h1>About this app</h1>
        <p className="lede">
          The Complaint Resolution System helps customers report a problem and helps the support team answer the most
          important ones first.
        </p>

        <section className="about-section">
          <h2>For customers</h2>
          <p className="lede">
            Create an account, then submit a complaint with a title, a description and, if you have one, an order
            reference. You can follow each complaint on your own page. It shows whether it is Open, In Progress or
            Resolved, and it shows the reply from support once someone on the team has answered.
          </p>
        </section>

        <section className="about-section">
          <h2>How complaints are sorted</h2>
          <p className="lede">
            Every new complaint is read automatically. The system picks a category (billing, delivery or product),
            checks how upset the message sounds, and sets a priority: Low, Medium, High or Urgent. Serious words such
            as fraud or legal action always make a complaint Urgent.
          </p>
        </section>

        <section className="about-section">
          <h2>For the support team</h2>
          <p className="lede">
            The support team sees open complaints with the highest priority first. For each one they can check the
            automatic analysis, fix the category or priority if it is wrong, edit the suggested reply and send it. The
            suggested reply is only a draft. A person always reads it before it is sent.
          </p>
        </section>

        <div className="home-actions">
          <Link to="/register" className="btn-primary-link">
            Create an account
          </Link>
          <Link to="/login" className="btn-secondary">
            Log in
          </Link>
        </div>
      </main>
    </div>
  )
}

export default About
