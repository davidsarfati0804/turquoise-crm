import { z } from 'zod'

export const eventSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  slug: z.string().min(1, 'Le slug est requis'),
  event_type: z.enum(['stay', 'wedding', 'other']),
  status: z.enum(['draft', 'active', 'archived']),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  hotel_name: z.string().nullable(),
  destination_label: z.string().nullable(),
  sales_open_at: z.string().nullable(),
  sales_close_at: z.string().nullable(),
  description: z.string().nullable(),
  notes: z.string().nullable(),
})

export type EventFormData = z.infer<typeof eventSchema>
