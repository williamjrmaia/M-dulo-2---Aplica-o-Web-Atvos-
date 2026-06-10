import { z } from 'zod';
import { emailSchema, textoObrigatorio, uuidSchema } from './common.schema';

export const loginSchema = z.object({
  email: emailSchema,
  senha: textoObrigatorio('senha'),
});

export const encerrarSessaoSchema = z.object({
  revogada_por: uuidSchema('revogada_por').optional(),
});

export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type EncerrarSessaoSchemaInput = z.infer<typeof encerrarSessaoSchema>;
