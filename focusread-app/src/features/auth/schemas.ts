import { z } from 'zod';

import { es } from '../../i18n/es';

export const EmailSchema = z.string().trim().min(1, es.auth.emailRequired).pipe(z.email(es.auth.emailInvalid));

// Mínimo 8 caracteres con al menos una letra y un número.
export const NewPasswordSchema = z
  .string()
  .min(8, es.auth.passwordRules)
  .regex(/[A-Za-z]/, es.auth.passwordRules)
  .regex(/\d/, es.auth.passwordRules);

export const LoginSchema = z.object({
  email: EmailSchema,
  password: z.string().min(1, es.auth.passwordRequired),
});

export const RegisterSchema = z
  .object({ email: EmailSchema, password: NewPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: es.auth.passwordMismatch, path: ['confirm'] });

export const ForgotSchema = z.object({ email: EmailSchema });

export const ResetSchema = z
  .object({ password: NewPasswordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: es.auth.passwordMismatch, path: ['confirm'] });

export type FieldErrors = Partial<Record<'email' | 'password' | 'confirm', string>>;

// Devuelve el primer error por campo, o null si los datos son válidos.
export function validate<T>(schema: z.ZodType<T>, values: unknown): { data: T; errors: null } | { data: null; errors: FieldErrors } {
  const parsed = schema.safeParse(values);
  if (parsed.success) return { data: parsed.data, errors: null };
  const errors: FieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as keyof FieldErrors | undefined;
    if (field && !errors[field]) errors[field] = issue.message;
  }
  return { data: null, errors };
}
