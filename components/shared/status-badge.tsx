import { Badge } from '@/components/ui/badge'
import { STATUS_COLORS } from '@/lib/constants/colors'
import {
  CRM_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
} from '@/lib/constants/statuses'
import { cn } from '@/lib/utils/format'

interface StatusBadgeProps {
  status: string
  type: 'crm' | 'payment' | 'invoice'
  className?: string
}

export function StatusBadge({ status, type, className }: StatusBadgeProps) {
  const labels = {
    crm: CRM_STATUS_LABELS,
    payment: PAYMENT_STATUS_LABELS,
    invoice: INVOICE_STATUS_LABELS,
  }

  const label = labels[type][status] || status
  const colorClass = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
