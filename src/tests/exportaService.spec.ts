import { ExportaService } from '../services/exportaService';
import { ExportaRepository } from '../repositories/exportaRepository';
import { ParceiroExportacao } from '../models/parceiro.model';
import { EmptyDataException, DataAccessException } from '../errors/exportaErrors';

// Stub do repositório: isola o service do banco para um teste unitário puro.
function repoStub(impl: () => Promise<ParceiroExportacao[]>): ExportaRepository {
  return { buscarTodosDadosParceiros: impl } as unknown as ExportaRepository;
}

const parceiroAmostra: ParceiroExportacao = {
  nome: 'Fazenda Modelo',
  contato: 'Contato Modelo',
  tipo_parceiro: 'arrendador',
  regiao: 'Ribeirão Preto',
  telefone_principal: '(16) 99999-0000',
  email: 'modelo@atvos.test',
  terra_unidade: 'Terra Modelo',
};

describe('ExportaService.processarExportacaoParceiros (unitário, com stub)', () => {
  // CT01 → RN04 (RF017): exportação com dados gera CSV com cabeçalho e a linha do parceiro
  it('gera um CSV com cabeçalho e os dados quando há parceiros', async () => {
    const service = new ExportaService(repoStub(async () => [parceiroAmostra]));

    const buffer = await service.processarExportacaoParceiros();
    const csv = buffer.toString('utf-8');

    expect(csv).toContain('nome,contato,tipo_parceiro,regiao,telefone_principal,email,terra_unidade');
    expect(csv).toContain('Fazenda Modelo');
    expect(csv).toContain('Contato Modelo');
    expect(csv).toContain('(16) 99999-0000');
    expect(csv).toContain('modelo@atvos.test');
    expect(csv).toContain('Terra Modelo');
  });

  // CT02 → RN04 (RF017): sem parceiros, lança EmptyDataException (vira 404 no controller)
  it('lança EmptyDataException quando não há parceiros para exportar', async () => {
    const service = new ExportaService(repoStub(async () => []));

    await expect(service.processarExportacaoParceiros()).rejects.toBeInstanceOf(EmptyDataException);
  });

  // CT03 → RN04 (RF017): falha de acesso a dados é propagada como DataAccessException
  it('propaga DataAccessException quando o repositório falha no acesso a dados', async () => {
    const service = new ExportaService(
      repoStub(async () => {
        throw new DataAccessException();
      })
    );

    await expect(service.processarExportacaoParceiros()).rejects.toBeInstanceOf(DataAccessException);
  });

  // CT04 → RN04 (RF017): erro genérico do repositório é encapsulado como DataAccessException
  it('encapsula um erro genérico do repositório como DataAccessException', async () => {
    const service = new ExportaService(
      repoStub(async () => {
        throw new Error('conexão recusada');
      })
    );

    await expect(service.processarExportacaoParceiros()).rejects.toBeInstanceOf(DataAccessException);
  });

  // CT05 → RN04 (RF017): campos com vírgula são escapados entre aspas no CSV
  it('escapa campos que contêm vírgula com aspas duplas', async () => {
    const service = new ExportaService(
      repoStub(async () => [{ ...parceiroAmostra, nome: 'Fazenda, Boa Vista' }])
    );

    const csv = (await service.processarExportacaoParceiros()).toString('utf-8');
    expect(csv).toContain('"Fazenda, Boa Vista"');
  });
});
