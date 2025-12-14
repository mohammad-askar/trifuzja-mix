
//E:\trifuzja-mix\app\components\editor\article.schema.ts
import { z } from 'zod';

// Excerpt is optional (empty string allowed).
export const ArticleFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(4, 'Too small: expected >3 characters')
    .max(140, 'Too long: max 140 characters'),
  excerpt: z
    .string()
    .trim()
    .max(400, 'Too long: max 400 characters')
    .optional()
    .or(z.literal('')),
  categoryId: z.string().trim().optional(),
});

export type ArticleFormValues = z.infer<typeof ArticleFormSchema>;
