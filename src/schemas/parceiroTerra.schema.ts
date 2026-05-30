import { z } from 'zod';

export const uuidFormato =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const vincularTerraAoParceiroSchema = z.object({
  terra_id: z.string().regex(uuidFormato, 'terra_id deve ser um UUID válido'),
  tipo_vinculo: z.string().min(1, 'tipo_vinculo não pode ser vazio').optional(),
});

export type VincularTerraAoParceiroInput = z.infer<typeof vincularTerraAoParceiroSchema>;
