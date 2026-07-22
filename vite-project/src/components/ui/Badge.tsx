import React from 'react'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'primary'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  size?: 'sm' | 'md'
  className?: string
  dot?: boolean
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  primary: 'bg-[#3d9cd6]/10 text-[#3d9cd6]',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  primary: 'bg-[#3d9cd6]',
}

export default function Badge({ children, variant = 'default', size = 'md', className = '', dot = false }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-0.5 text-xs'}
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  )
}

export function getAppointmentStatusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    scheduled: 'info',
    completed: 'success',
    cancelled: 'danger',
    'no-show': 'warning',
  }
  return map[status] || 'default'
}

export function getInvoiceStatusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    draft: 'default',
    sent: 'info',
    paid: 'success',
    overdue: 'danger',
  }
  return map[status] || 'default'
}
