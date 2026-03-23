import { z } from 'zod'

export const leadSchema = z.object({
  event_id: z.string().uuid().nullable(),
  source: z.enum(['whatsapp', 'phone', 'email', 'manual', 'other']),
  primary_contact_name: z.string().min(1, 'Le nom est requis'),
  primary_contact_phone: z.string().nullable(),
  primary_contact_email: z.string().email().nullable().or(z.literal('')),
  raw_message: z.string().nullable(),
  internal_summary: z.string().nullable(),
})

export type LeadFormData = z.infer<typeof leadSchema>
