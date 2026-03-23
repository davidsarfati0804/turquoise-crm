import { cn } from '@/lib/utils/format'

interface LoadingSkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: LoadingSkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <LoadingSkeleton className="h-6 w-1/3" />
      <LoadingSkeleton className="h-4 w-full" />
      <LoadingSkeleton className="h-4 w-2/3" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <LoadingSkeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}
