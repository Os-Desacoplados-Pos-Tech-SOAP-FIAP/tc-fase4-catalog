import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { PerfilAcesso } from '../../src/common/auth/perfil';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { criarApp } from '../helpers/app';
import { limparBanco } from '../helpers/database';
import { token } from '../helpers/tokens';

describe('Catálogo (e2e)', () => {
  let app: INestApplication;
  const admin = token(PerfilAcesso.ADMINISTRADOR);
  const mecanico = token(PerfilAcesso.MECANICO);
  const cliente = token(PerfilAcesso.CLIENTE);

  beforeAll(async () => (app = await criarApp()));
  beforeEach(() => limparBanco(app.get(PrismaService)));
  afterAll(() => app.close());

  const http = () => request(app.getHttpServer());

  it('exige token (401) e perfil adequado (403)', async () => {
    await http().get('/api/catalog/servicos').expect(401);
    await http().get('/api/catalog/servicos').set('Authorization', 'Bearer invalido').expect(401);
    await http().get('/api/catalog/servicos').set('Authorization', cliente).expect(403);
    await http()
      .post('/api/catalog/servicos')
      .set('Authorization', mecanico)
      .send({ nome: 'Troca de óleo', descricao: 'Motor', valorPadrao: 120 })
      .expect(403);
  });

  it('CRUD de serviço com busca por id', async () => {
    const criado = await http()
      .post('/api/catalog/servicos')
      .set('Authorization', admin)
      .send({ nome: 'Troca de óleo', descricao: 'Motor', valorPadrao: 120 })
      .expect(201);

    const id = criado.body.id as string;
    await http().get(`/api/catalog/servicos/${id}`).set('Authorization', mecanico).expect(200)
      .expect((res) => expect(res.body).toMatchObject({ nome: 'Troca de óleo', valorPadrao: 120 }));
    await http().put(`/api/catalog/servicos/${id}`).set('Authorization', admin)
      .send({ valorPadrao: 135 }).expect(200)
      .expect((res) => expect(res.body.valorPadrao).toBe(135));
    await http().get('/api/catalog/servicos').set('Authorization', mecanico).expect(200)
      .expect((res) => expect(res.body).toHaveLength(1));
    await http().get('/api/catalog/servicos/11111111-1111-4111-8111-111111111111')
      .set('Authorization', admin).expect(404);
    await http().get('/api/catalog/servicos/nao-uuid').set('Authorization', admin).expect(400);
  });

  it('insumo: cadastro, conflito, busca, estoque e validações', async () => {
    const corpo = { codigo: 'FIL-001', nome: 'Filtro', tipo: 'PECA', valorUnitario: 45, quantidadeEstoque: 10 };
    const criado = await http().post('/api/catalog/insumos').set('Authorization', admin).send(corpo).expect(201);
    await http().post('/api/catalog/insumos').set('Authorization', admin).send(corpo).expect(409);

    const id = criado.body.id as string;
    await http().get(`/api/catalog/insumos/${id}`).set('Authorization', mecanico).expect(200)
      .expect((res) => expect(res.body).toMatchObject({ codigo: 'FIL-001', quantidadeDisponivel: 10 }));
    await http().patch(`/api/catalog/insumos/${id}/estoque`).set('Authorization', mecanico)
      .send({ quantidade: 3 }).expect(200)
      .expect((res) => expect(res.body.quantidadeEstoque).toBe(3));
    await http().patch(`/api/catalog/insumos/${id}/estoque`).set('Authorization', mecanico)
      .send({ quantidade: -1 }).expect(400);
    await http().post('/api/catalog/insumos').set('Authorization', admin)
      .send({ ...corpo, codigo: 'X-1', campoExtra: true }).expect(400);
    await http().post('/api/catalog/insumos').set('Authorization', admin)
      .send({ ...corpo, codigo: 'Y-1', nome: '   ' }).expect(422) // passa no DTO, barra no domínio
      .expect((res) => expect(res.body.code).toBe('INSUMO_NOME_INVALIDO'));
    await http().get('/api/catalog/insumos').set('Authorization', admin).expect(200)
      .expect((res) => expect(res.body).toHaveLength(1));
  });
});
