import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/Button'
import { ErrorBanner } from '../components/ErrorBanner'
import { TextField } from '../components/TextField'

interface FormState {
  name: string
  surname: string
  email: string
  password: string
}

const INITIAL_STATE: FormState = { name: '', surname: '', email: '', password: '' }

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({})
  const [error, setError] = useState<unknown>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const nextFieldErrors: Partial<FormState> = {}
    if (!form.name.trim()) nextFieldErrors.name = 'Name is required'
    if (!form.surname.trim()) nextFieldErrors.surname = 'Surname is required'
    if (!form.email.trim()) nextFieldErrors.email = 'Email is required'
    if (!form.password) nextFieldErrors.password = 'Password is required'
    setFieldErrors(nextFieldErrors)
    if (Object.keys(nextFieldErrors).length > 0) return

    setIsSubmitting(true)
    try {
      await register(form)
      navigate('/')
    } catch (submitError) {
      setError(submitError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold text-gray-900">Register</h1>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <TextField
          label="First name"
          name="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          error={fieldErrors.name}
        />
        <TextField
          label="Surname"
          name="surname"
          value={form.surname}
          onChange={(e) => update('surname', e.target.value)}
          error={fieldErrors.surname}
        />
        <TextField
          label="Email"
          type="email"
          name="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          value={form.password}
          onChange={(e) => update('password', e.target.value)}
          error={fieldErrors.password}
        />
        {error != null && <ErrorBanner error={error} />}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Registering…' : 'Register'}
        </Button>
      </form>
      <p className="text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
