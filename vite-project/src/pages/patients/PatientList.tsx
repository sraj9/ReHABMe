import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, UserCheck, UserX, Phone, Mail } from 'lucide-react'
import { parseISO, differenceInYears } from 'date-fns'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Pagination from '../../components/ui/Pagination'
import { usePatientsContext } from '../../context/PatientsContext'

const PAGE_SIZE = 10

export default function PatientList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const { patients, loading } = usePatientsContext()

  const filtered = patients.filter(p => {
    const matchSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search) ||
      (p.email?.toLowerCase().includes(search.toLowerCase()) ?? false)

    const matchStatus =
      filterActive === 'all' ||
      (filterActive === 'active' && p.is_active) ||
      (filterActive === 'inactive' && !p.is_active)

    return matchSearch && matchStatus
  })

  // Clamp rather than reset-in-effect so filter changes can't leave us past the last page
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{patients.length} total patients registered</p>
          <span className="flex items-center gap-1 text-xs text-gray-500"><UserCheck size={12} className="text-green-500" /> {patients.filter(p => p.is_active).length} active</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><UserX size={12} className="text-gray-400" /> {patients.filter(p => !p.is_active).length} inactive</span>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => navigate('/patients/new')}>
          Add Patient
        </Button>
      </div>

      <Card padding="none">
        {/* Filters bar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, MRN, phone, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterActive(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${filterActive === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">MRN</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnosis</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Insurance</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Loading patients…' : 'No patients found matching your search'}
                  </td>
                </tr>
              ) : (
                paged.map(patient => {
                  const age = differenceInYears(new Date(), parseISO(patient.date_of_birth))
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (e.key === ' ') e.preventDefault()
                          navigate(`/patients/${patient.id}`)
                        }
                      }}
                      className="hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d9cd6] focus-visible:ring-inset"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] font-semibold text-sm flex-shrink-0">
                            {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{patient.full_name}</p>
                            <p className="text-xs text-gray-500">{age} yrs &bull; {patient.gender}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">{patient.mrn}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Phone size={11} className="text-gray-400" />
                            {patient.phone}
                          </div>
                          {patient.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Mail size={11} className="text-gray-400" />
                              {patient.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-gray-700 max-w-xs truncate">{patient.primary_diagnosis || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs text-gray-600">{patient.insurance_provider || 'Self-pay'}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={patient.is_active ? 'success' : 'default'} dot>
                          {patient.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} label="patients" />
      </Card>
    </div>
  )
}
