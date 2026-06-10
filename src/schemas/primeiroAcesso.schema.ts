import { z } from 'zod';
import { emailSchema, textoObrigatorio } from './common.schema';

export const solicitarPrimeiroAcessoSchema = z.object({
  email: emailSchema,
});

export const definirSenhaPrimeiroAcessoSchema = z
  .object({
    token: textoObrigatorio('token'),
    senha: z.string().min(8, 'senha deve ter pelo menos 8 caracteres'),
    confirmacao_senha: textoObrigatorio('confirmacao_senha'),
  })
  .refine((data) => data.senha === data.confirmacao_senha, {
    message: 'Senhas não coincidem',
    path: ['confirmacao_senha'],
  });

export type SolicitarPrimeiroAcessoSchemaInput = z.infer<typeof solicitarPrimeiroAcessoSchema>;
export type DefinirSenhaPrimeiroAcessoSchemaInput = z.infer<typeof definirSenhaPrimeiroAcessoSchema>;
