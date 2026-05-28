import request from 'supertest';
import app from '../app';
import pool from '../config/connection';

const SEED_USER_ID = '00000000-0000-0000-0000-000000000001';

beforeEach(async () => {
    await pool.query('TRUNCATE parceiros RESTART IDENTITY CASCADE');
    await pool.query('DELETE FROM usuarios WHERE id = $1', [SEED_USER_ID]);
    await pool.query(
        `INSERT INTO perfil_acesso (nome, requer_aprovacao) VALUES ('analista', false) ON CONFLICT (nome) DO NOTHING`
    );
    const { rows } = await pool.query(`SELECT id FROM perfil_acesso WHERE nome = 'analista'`);
    await pool.query(
        `INSERT INTO usuarios (id, perfil_acesso_id, nome, email, ativo) VALUES ($1, $2, 'Admin', 'admin@test.com', true)`,
        [SEED_USER_ID, rows[0].id]
    );
});

afterAll(async () => {
    await pool.end();
});

describe('PATCH /api/parceiros/:id', () => {
    // cria um parceiro para ser editado
    it('deve atualizar os dados do parceiro e retornar o registro atualizado com status 200', async () => {
        const criado = await request(app).post('/api/parceiros').send({
            nome: 'João da Silva',
            tipo_pessoa: 'fisica',
            cpf_cnpj: '12345678901',
            criado_por: SEED_USER_ID,
        });

        //edita o parceiro criado
        const res = await request(app).patch(`/api/parceiros/${criado.body.id}`).send({
            nome: 'João da Silva Editado',
            atualizado_por: SEED_USER_ID,
        });

        //verifica se o parceiro foi editado
        expect(res.status).toBe(200);
        expect(res.body.nome).toBe('João da Silva Editado');
        expect(res.body.atualizado_por).toBe(SEED_USER_ID);
    });

    // caso de email ou cpf_cnpj duplicado → 409.
    it('deve rejeitar atualização com cpf_cnpj já cadastrado em outro parceiro, garantindo unicidade (RN09)', async () => {
        // cria o primeiro parceiro
        await request(app).post('/api/parceiros').send({
            nome: 'João',
            tipo_pessoa: 'fisica',
            cpf_cnpj: '11111111111',
            criado_por: SEED_USER_ID,
        });

        // cria o segundo parceiro
        const segundo = await request(app).post('/api/parceiros').send({
            nome: 'Maria',
            tipo_pessoa: 'fisica',
            cpf_cnpj: '22222222222',
            criado_por: SEED_USER_ID,
        });

        // tenta editar o segundo para ter o CPF do primeiro → 409
        const res = await request(app).patch(`/api/parceiros/${segundo.body.id}`).send({
            cpf_cnpj: '11111111111',
            atualizado_por: SEED_USER_ID,
        });

        expect(res.status).toBe(409);
    });

    // caso de não ter campos editaveis → 400.
    it('deve rejeitar atualização sem campos editáveis, garantindo que pelo menos um campo seja fornecido (RN10)', async () => {
        // cria um parceiro para ser editado
        const criado = await request(app).post('/api/parceiros').send({
            nome: 'João da Silva',
            tipo_pessoa: 'fisica',
            cpf_cnpj: '12345678901',
            criado_por: SEED_USER_ID,
        });

        // tenta editar sem campos editáveis → 400
        const res = await request(app).patch(`/api/parceiros/${criado.body.id}`).send({
            atualizado_por: SEED_USER_ID,
        });

        expect(res.status).toBe(400);
    });

    // caso de persistência: SELECT confirma campos editados e atualizado_por correto.
    it('deve constar o parceiro atualizado no banco de dados, garantindo persistência', async () => {
        // cria um parceiro para ser editado
        const criado = await request(app).post('/api/parceiros').send({
            nome: 'Teste Persistência',
            tipo_pessoa: 'juridica',
            cpf_cnpj: '00000000000191',
            criado_por: SEED_USER_ID,
        });

        // edita o parceiro criado
        const res = await request(app).patch(`/api/parceiros/${criado.body.id}`).send({
            nome: 'Teste Persistência Editado',
            atualizado_por: SEED_USER_ID,
        });

        expect(res.status).toBe(200);
        expect(res.body.nome).toBe('Teste Persistência Editado');
        expect(res.body.atualizado_por).toBe(SEED_USER_ID);

        const { rows } = await pool.query('SELECT nome, atualizado_por FROM parceiros WHERE id = $1', [criado.body.id]);
        expect(rows[0].nome).toBe('Teste Persistência Editado');
        expect(rows[0].atualizado_por).toBe(SEED_USER_ID);
    });
});