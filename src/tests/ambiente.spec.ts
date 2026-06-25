import {
  variaveisObrigatoriasAusentes,
  mensagemAmbienteInvalido,
  garantirAmbienteValido,
} from '../config/ambiente';

// Testes puros do validador de ambiente: não tocam process.env nem banco,
// recebem o env explicitamente.
describe('config/ambiente — validação de variáveis obrigatórias', () => {
  it('acusa JWT_SECRET e DATABASE_URL quando ambos estão ausentes', () => {
    expect(variaveisObrigatoriasAusentes({})).toEqual([
      'JWT_SECRET',
      'DATABASE_URL',
    ]);
  });

  it('não acusa nada quando JWT_SECRET e DATABASE_URL estão presentes', () => {
    const env = {
      JWT_SECRET: 'segredo',
      DATABASE_URL: 'postgresql://u:s@host:5432/db',
    };
    expect(variaveisObrigatoriasAusentes(env)).toEqual([]);
  });

  it('aceita DB_HOST como alternativa ao DATABASE_URL', () => {
    const env = { JWT_SECRET: 'segredo', DB_HOST: 'localhost' };
    expect(variaveisObrigatoriasAusentes(env)).toEqual([]);
  });

  it('trata valor só com espaços como ausente', () => {
    const env = { JWT_SECRET: '   ', DATABASE_URL: 'postgresql://u:s@host/db' };
    expect(variaveisObrigatoriasAusentes(env)).toEqual(['JWT_SECRET']);
  });

  it('mensagem de erro inclui a dica de geração do JWT_SECRET', () => {
    const msg = mensagemAmbienteInvalido(['JWT_SECRET']);
    expect(msg).toContain('JWT_SECRET');
    expect(msg).toContain('openssl rand -hex 32');
  });

  it('garantirAmbienteValido lança quando falta variável obrigatória', () => {
    expect(() => garantirAmbienteValido({})).toThrow(/JWT_SECRET/);
  });

  it('garantirAmbienteValido não lança quando o ambiente está completo', () => {
    const env = {
      JWT_SECRET: 'segredo',
      DATABASE_URL: 'postgresql://u:s@host:5432/db',
    };
    expect(() => garantirAmbienteValido(env)).not.toThrow();
  });
});
