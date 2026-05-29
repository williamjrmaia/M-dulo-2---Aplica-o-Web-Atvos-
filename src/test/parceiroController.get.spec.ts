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

describe('GET /api/parceiros', () => {
    it('deve retornar a lista de parceiros ativos cadastrados', async () => {
        await request(app).post('/api/parceiros').send({
            nome: 'João da Silva',
            tipo_pessoa: 'fisica',
            cpf_cnpj: '12345678901',
            criado_por: SEED_USER_ID,
        });

        const res = await request(app).get('/api/parceiros');

        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1);
        expect(res.body[0].nome).toBe('João da Silva');
    });

    it('deve retornar array vazio quando não há parceiros', async () => {
        const res = await request(app).get('/api/parceiros');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('não deve incluir parceiros com status inativo na listagem (RN08)', async () => {
        // insere direto no banco com status inativo — POST não aceita esse campo
        await pool.query(
            `INSERT INTO parceiros (nome, tipo_pessoa, cpf_cnpj, criado_por, status)
             VALUES ('João Inativo', 'fisica', '12345678901', $1, 'inativo')`,
            [SEED_USER_ID]
        );

        const res = await request(app).get('/api/parceiros');

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('deve retornar dados que conferem com o que está salvo no banco', async () => {
        const criado = await request(app).post('/api/parceiros').send({
            nome: 'Teste Persistência',
            tipo_pessoa: 'juridica',
            cpf_cnpj: '00000000000191',
            criado_por: SEED_USER_ID,
        });

        const res = await request(app).get('/api/parceiros');

        expect(res.status).toBe(200);
        expect(res.body.length).toBe(1);

        const { rows } = await pool.query('SELECT nome, criado_por FROM parceiros WHERE id = $1', [criado.body.id]);
        expect(res.body[0].nome).toBe(rows[0].nome);
        expect(res.body[0].criado_por).toBe(rows[0].criado_por);
    });
});