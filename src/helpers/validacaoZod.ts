import { z } from 'zod';
import { ValidationError } from '../errors/AppError';

/**
 * Valida `dados` contra o schema Zod e devolve os dados tipados.
 * Se a validação falhar, lança ValidationError com as issues formatadas
 * no mesmo padrão usado pelos controllers ("campo: mensagem; campo: mensagem").
 *
 * `campoPadrao` é o rótulo usado quando a issue não tem caminho (ex: 'body' ou 'query'),
 * preservando a mensagem que cada controller já produzia.
 */
export function parseOrThrow<T>(schema: z.ZodType<T>, dados: unknown, campoPadrao = 'body'): T {
  const parsed = schema.safeParse(dados);
  if (!parsed.success) {
    const detalhes = parsed.error.issues
      .map((i) => `${i.path.join('.') || campoPadrao}: ${i.message}`)
      .join('; ');
    throw new ValidationError(detalhes);
  }
  return parsed.data;
}
