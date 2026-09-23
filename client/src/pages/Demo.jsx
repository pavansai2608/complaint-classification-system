import { Link } from 'react-router-dom'
import StatusBadge from '../components/StatusBadge'

// Fixed sample data, not fetched from the API - this page exists so anyone
// can see a fully processed complaint (category, emotion, priority, AI draft,
// agent reply) without creating an account first. The urgent keyword really
// is "refund not received" from config/urgent_keywords.json, so the priority
// shown here matches what the same text would get from the real pipeline.
const SAMPLE = {
  title: 'Payment not received for order #4821',
  orderReference: '#4821',
  description:
    "I placed order #4821 twelve days ago. The payment page showed it succeeded, but the order still shows as unpaid on my account, and a refund not received from a return I made last month is still missing too. I've written in twice already with no reply. This needs sorting out today.",
  category: 'billing',
  emotion: { label: 'negative', score: 0.87 },
  priority: 'Urgent',
  status: 'Resolved',
  suggestedReply:
    "Hi, I'm sorry for the trouble with order #4821. I can see the payment went through on our end but did not update your order status - that's a bug on our side, not something you did wrong. I've corrected the order to paid and started a refund check with our payments team; you'll have an update within 24 hours. Thank you for flagging the missed replies, that shouldn't have happened.",
  agentReply:
    "Hi, sorry for the trouble with order #4821 - the payment did go through, our system just failed to mark the order as paid. I've fixed that and opened a refund check with our payments team; you'll hear back within 24 hours. Thanks for your patience, and sorry the first two messages went unanswered.",
}

function Demo() {
  return (
    <div className="page">
      <header className="top-bar">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            CR
          </span>
          Complaint Resolution System
        </Link>
        <Link to="/about" className="top-bar-about-link">
          About
        </Link>
      </header>

      <main className="home-hero demo-page">
        <p className="demo-banner">
          Live example — no account needed. This is exactly what a real complaint looks like after it has gone
          through the pipeline: automatic category, emotion, priority, an AI-drafted reply, and the version a
          person on the support team actually sent.
        </p>

        <h1>{SAMPLE.title}</h1>
        <div className="complaint-card-badges demo-badges">
          <StatusBadge status={SAMPLE.status} />
          <span className={`priority-badge priority-badge-${SAMPLE.priority.toLowerCase()}`}>{SAMPLE.priority}</span>
        </div>

        <p className="lede">{SAMPLE.description}</p>
        <p className="lede">Order reference: {SAMPLE.orderReference}</p>

        <div className="ai-analysis">
          <p>
            <strong>Category:</strong> {SAMPLE.category}
          </p>
          <p>
            <strong>AI emotion:</strong> {SAMPLE.emotion.label} ({SAMPLE.emotion.score})
          </p>
          <p>
            <strong>Why Urgent:</strong> the message matched the urgent keyword &ldquo;refund not received&rdquo;, so
            it skips the queue regardless of tone.
          </p>
          <p>
            <strong>Suggested reply (AI draft):</strong> {SAMPLE.suggestedReply}
          </p>
        </div>

        <div className="agent-reply">
          <h2>Reply from support (written and sent by a person)</h2>
          <p className="lede">{SAMPLE.agentReply}</p>
        </div>

        <div className="home-actions">
          <Link to="/register" className="btn-primary-link">
            Create a free account
          </Link>
          <Link to="/" className="btn-secondary">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  )
}

export default Demo
