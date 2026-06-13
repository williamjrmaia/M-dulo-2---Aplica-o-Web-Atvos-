import { z } from 'zod';
import { booleanFormSchema, emailSchema, textoObrigatorio, uuidSchema } from './common.schema';

export const criarUsuarioSchema = z.object({
  nome: textoObrigatorio('nome'),
  email: emailSchema,
  perfil_acesso_id: uuidSchema('perfil_acesso_id'),
});

export const atualizarUsuarioSchema = z
  .object({
    nome: textoObrigatorio('nome').optional(),
    email: emailSchema.optional(),
    ativo: booleanFormSchema.optional(),
    perfil_acesso_id: uuidSchema('perfil_acesso_id').optional(),
  })
  .refine(
    (data) =>
      data.nome !== undefined ||
      data.email !== undefined ||
      data.ativo !== undefined ||
      data.perfil_acesso_id !== undefined,
    'pelo menos um campo editável deve ser informado'
  );

export const atualizarPerfilUsuarioSchema = z
  .object({
    role_id: uuidSchema('role_id').optional(),
    perfil_acesso_id: uuidSchema('perfil_acesso_id').optional(),
  })
  .transform((data) => ({
    role_id: data.role_id ?? data.perfil_acesso_id,
  }))
  .refine((data) => data.role_id !== undefined, 'role_id é obrigatório');

export type CriarUsuarioSchemaInput = z.infer<typeof criarUsuarioSchema>;
export type AtualizarUsuarioSchemaInput = z.infer<typeof atualizarUsuarioSchema>;
export type AtualizarPerfilUsuarioSchemaInput = z.infer<typeof atualizarPerfilUsuarioSchema>;
