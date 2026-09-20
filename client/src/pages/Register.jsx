import { useState } from 'react'
import axios from 'axios'

const initialForm = { name: '', email: '', password: '' }

function Register() {
  const [form, setForm] = useState(initialForm)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFieldErrors({})
    setFormError('')
    setSubmitting(true)

    try {
      await axios.post('/api/auth/register', form)
      setSuccess(true)
      setForm(initialForm)
    } catch (err) {
      const apiError = err.response?.data?.error
      if (apiError?.code === 'VALIDATION_ERROR' && apiError.details) {
        const errors = {}
        apiError.details.forEach((detail) => {
          errors[detail.field] = detail.message
        })
        setFieldErrors(errors)
      } else if (apiError?.message) {
        setFormError(apiError.message)
      } else {
        setFormError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <main className="app">
        <h1>Account created</h1>
        <p>You can now log in with your email and password.</p>
      </main>
    )
  }

  return (
    <main className="app">
      <h1>Create an account</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="name">Name</label>
          <input id="name" name="name" value={form.name} onChange={handleChange} required />
          {fieldErrors.name && <p role="alert">{fieldErrors.name}</p>}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
          {fieldErrors.email && <p role="alert">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <p>At least 8 characters, with a letter and a number.</p>
          {fieldErrors.password && <p role="alert">{fieldErrors.password}</p>}
        </div>

        {formError && <p role="alert">{formError}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </main>
  )
}

export default Register
