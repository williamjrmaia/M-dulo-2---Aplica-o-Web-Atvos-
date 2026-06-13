import { z } from 'zod';

export const uuidFormato =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuidSchema = (campo: string) =>
  z.string().regex(uuidFormato, `${campo} deve ser um UUID válido`);

export const textoObrigatorio = (campo: string) =>
  z.string().trim().min(1, `${campo} é obrigatório`);

export const emailSchema = z.string().trim().email('email deve ter formato válido').toLowerCase();

export const booleanFormSchema = z.preprocess(
  (value) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  },
  z.boolean('ativo deve ser booleano')
);

export function formatarErrosZod(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
    .join('; ');
}
