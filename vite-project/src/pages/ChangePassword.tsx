import React, { useState } from 'react'
import { KeyRound } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import Button from '../components/ui/Button'

/**
 * Full-screen gate shown when a staff member logs in with a temporary
 * password (profiles.must_change_password). They cannot reach the app
 * until they set their own password.
 */
export default function ChangePassword() {
  const { changePassword, signOut, profile } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setSaving(true)
    const { error: err } = await changePassword(password)
    setSaving(false)
    if (err) setError(err.message)
    // On success, must_change_password clears in the auth context and the app renders
  }

  return (
    <div className="min-h-screen bg-[#f4f7ed] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-[#3d9cd6]/10 rounded-full mb-3">
            <KeyRound size={22} className="text-[#3d9cd6]" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Set your password</h1>
          <p className="text-sm text-gray-500 mt-1 text-center">
            Welcome{profile ? `, ${profile.full_name}` : ''}! You signed in with a temporary
            password — choose your own to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat the password"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
            />
          </div>

          <Button type="submit" loading={saving} className="w-full">
            Save password and continue
          </Button>

          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full text-center text-sm text-gray-500 hover:text-gray-700"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  )
}
