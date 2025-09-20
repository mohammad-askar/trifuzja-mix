import { z } from 'zod';

// ✅ excerpt اختياري (سلسلة فاضية مسموح بها). سنفرضه منطقيًا فقط عند عدم تفعيل الفيديو فقط.
export const ArticleFormSchema = z.object({
  title: z.string().trim().min(4, 'Too small: expected >3 characters').max(140),
  excerpt: z.string().trim().max(400).optional().or(z.literal('')),
  categoryId: z.string().trim().optional(),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

export type ArticleFormValues = z.infer<typeof ArticleFormSchema>;
