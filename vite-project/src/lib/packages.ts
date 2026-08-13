import type { SessionPackage, PatientSession } from './types'

export function sessionsUsed(packageId: string, sessions: PatientSession[]): number {
  return sessions.filter(s => s.package_id === packageId).length
}

export function sessionsRemaining(pkg: SessionPackage, sessions: PatientSession[]): number {
  return Math.max(0, pkg.total_sessions - sessionsUsed(pkg.id, sessions))
}

/** The package the next session should draw from: active, with sessions left, oldest first. */
export function activePackageFor(
  patientId: string,
  packages: SessionPackage[],
  sessions: PatientSession[]
): SessionPackage | undefined {
  return packages
    .filter(p => p.patient_id === patientId && p.is_active && sessionsRemaining(p, sessions) > 0)
    .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at))[0]
}
