import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/format'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 rounded-full bg-gray-100 p-3">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      )}
      <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
      {description && (
        <p className="mb-4 text-sm text-gray-600 max-w-sm">{description}</p>
      )}
      {action}
    </div>
  )
}
