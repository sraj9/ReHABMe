import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PatientForm from './PatientForm'
import { PatientsProvider } from '../../context/PatientsContext'
import { ToastProvider } from '../../context/ToastContext'

function renderForm() {
  return render(
    <MemoryRouter initialEntries={['/patients/new']}>
      <ToastProvider>
        <PatientsProvider>
          <Routes>
            <Route path="/patients/new" element={<PatientForm />} />
            <Route path="/patients" element={<div>patient list page</div>} />
          </Routes>
        </PatientsProvider>
      </ToastProvider>
    </MemoryRouter>
  )
}

describe('PatientForm', () => {
  it('blocks submission and shows an error when the name is empty', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getAllByRole('button', { name: /create patient/i })[0])

    expect(screen.getByText('Full name is required')).toBeInTheDocument()
    // Still on the form — no navigation happened
    expect(screen.queryByText('patient list page')).not.toBeInTheDocument()
  })

  it('creates a patient with just a name — mobile number and DOB are optional', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(screen.getByPlaceholderText('e.g. Jane Smith'), 'Test Person')

    await user.click(screen.getAllByRole('button', { name: /create patient/i })[0])

    // Navigated to the list, and a success toast fired
    expect(await screen.findByText('patient list page')).toBeInTheDocument()
    expect(screen.getByText(/Test Person created/)).toBeInTheDocument()
  })

  it('clears a field error once the user types into it', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getAllByRole('button', { name: /create patient/i })[0])
    expect(screen.getByText('Full name is required')).toBeInTheDocument()

    await user.type(screen.getByPlaceholderText('e.g. Jane Smith'), 'A')
    expect(screen.queryByText('Full name is required')).not.toBeInTheDocument()
  })
})
