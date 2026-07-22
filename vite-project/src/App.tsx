import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { PatientsProvider } from './context/PatientsContext'
import { StaffProvider } from './context/StaffContext'
import { ToastProvider } from './context/ToastContext'
import { AppointmentsProvider } from './context/AppointmentsContext'
import { NotesProvider } from './context/NotesContext'
import { InvoicesProvider } from './context/InvoicesContext'

// Layout
import Layout from './components/layout/Layout'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import PatientList from './pages/patients/PatientList'
import PatientDetail from './pages/patients/PatientDetail'
import PatientForm from './pages/patients/PatientForm'
import AppointmentList from './pages/appointments/AppointmentList'
import NotesList from './pages/notes/NotesList'
import InvoiceList from './pages/billing/InvoiceList'
import Settings from './pages/settings/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const auth = React.useContext(AuthContext)

  if (auth.loading) {
    return (
      <div className="min-h-screen bg-[#f4f7ed] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.svg" alt="ReHABMe" className="h-12 w-auto mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Patients */}
        <Route path="patients" element={<PatientList />} />
        <Route path="patients/new" element={<PatientForm />} />
        <Route path="patients/:id" element={<PatientDetail />} />
        <Route path="patients/:id/edit" element={<PatientForm />} />

        {/* Appointments */}
        <Route path="appointments" element={<AppointmentList />} />

        {/* SOAP Notes */}
        <Route path="notes" element={<NotesList />} />

        {/* Billing */}
        <Route path="billing" element={<InvoiceList />} />

        {/* Settings */}
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AuthProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthProvider()
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
      <AuthProvider>
        <StaffProvider>
          <PatientsProvider>
            <AppointmentsProvider>
              <NotesProvider>
                <InvoicesProvider>
                  <AppRoutes />
                </InvoicesProvider>
              </NotesProvider>
            </AppointmentsProvider>
          </PatientsProvider>
        </StaffProvider>
      </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
