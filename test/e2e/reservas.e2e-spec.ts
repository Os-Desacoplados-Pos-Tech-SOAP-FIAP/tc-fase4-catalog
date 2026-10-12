import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { criarEnvelope } from '../../src/application/ports/message-envelope';
import { CATALOG_COMMANDS, CATALOG_EVENTS } from '../../src/application/reserva/catalog-messages';
import { PerfilAcesso } from '../../src/common/auth/perfil';
import { PrismaService } from '../../src/infrastructure/database/prisma.service';
import { MensagemInvalidaError } from '../../src/infrastructure/messaging/message-envelope.parser';
import { MessageHandlerRegistry } from '../../src/infrastructure/messaging/message-handler.registry';
import { criarApp } from '../helpers/app';
import { limparBanco } from '../helpers/database';
import { token } from '../helpers/tokens';

const OS = '7f2b2a8e-1d7c-4a35-9c1e-0a4f3b2c1d10';

describe('Reservas pela mensageria (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let registry: MessageHandlerRegistry;
  const admin = token(PerfilAcesso.ADMINISTRADOR);
  const cliente = token(PerfilAcesso.CLIENTE);

  beforeAll(async () => {
    app = await criarApp();
    prisma = app.get(PrismaService);
    registry = app.get(MessageHandlerRegistry);
  });
  beforeEach(() => limparBanco(prisma));
  afterAll(() => app.close());

  const tiposNaOutbox = async () =>
    (await prisma.outbox.findMany({ orderBy: { seq: 'asc' } })).map((o) => o.type);

  const criarInsumo = async () =>
    (await request(app.getHttpServer())
      .post('/api/catalog/insumos').set('Authorization', admin)
      .send({ codigo: 'FIL-001', nome: 'Filtro', tipo: 'PECA', valorUnitario: 45, quantidadeEstoque: 5 })
      .expect(201)).body.id as string;

  const buscarInsumo = async (id: string) =>
    (await request(app.getHttpServer())
      .get(`/api/catalog/insumos/${id}`).set('Authorization', admin).expect(200)).body;

  it('reservar → liberar (compensação) com histórico visível em GET /reservas', async () => {
    const insumoId = await criarInsumo();

    await registry.despachar(
      criarEnvelope(CATALOG_COMMANDS.RESERVAR_INSUMOS, OS, {
        itens: [{ insumoId, quantidade: 2 }],
      }),
    );
    expect(await buscarInsumo(insumoId)).toMatchObject({ quantidadeDisponivel: 3, quantidadeReservada: 2 });

    await registry.despachar(criarEnvelope(CATALOG_COMMANDS.LIBERAR_RESERVAS, OS, {}));
    expect(await buscarInsumo(insumoId)).toMatchObject({ quantidadeDisponivel: 5, quantidadeReservada: 0 });

    const reservas = await request(app.getHttpServer())
      .get(`/api/catalog/reservas?osId=${OS}`).set('Authorization', admin).expect(200);
    expect(reservas.body).toHaveLength(1);
    expect(reservas.body[0]).toMatchObject({ status: 'LIBERADA', itens: [{ quantidade: 2 }] });
    expect(await tiposNaOutbox()).toEqual([
      CATALOG_EVENTS.INSUMOS_RESERVADOS,
      CATALOG_EVENTS.RESERVAS_LIBERADAS,
    ]);
  });

  it('reservar → baixar após a execução', async () => {
    const insumoId = await criarInsumo();
    await registry.despachar(
      criarEnvelope(CATALOG_COMMANDS.RESERVAR_INSUMOS, OS, { itens: [{ insumoId, quantidade: 2 }] }),
    );
    await registry.despachar(criarEnvelope(CATALOG_COMMANDS.BAIXAR_RESERVAS, OS, {}));
    expect(await buscarInsumo(insumoId)).toMatchObject({
      quantidadeEstoque: 3,
      quantidadeReservada: 0,
      quantidadeDisponivel: 3,
    });
    expect(await tiposNaOutbox()).toEqual([
      CATALOG_EVENTS.INSUMOS_RESERVADOS,
      CATALOG_EVENTS.ESTOQUE_BAIXADO,
    ]);
  });

  it('GET /reservas exige osId UUID válido (400) e perfil autorizado (403)', async () => {
    await request(app.getHttpServer()).get('/api/catalog/reservas').set('Authorization', admin).expect(400);
    await request(app.getHttpServer())
      .get('/api/catalog/reservas?osId=nao-uuid').set('Authorization', admin).expect(400);
    await request(app.getHttpServer())
      .get(`/api/catalog/reservas?osId=${OS}`).set('Authorization', cliente).expect(403);
  });

  it('payload fora do contrato é rejeitado (vai para a DLQ)', async () => {
    await expect(
      registry.despachar(
        criarEnvelope(CATALOG_COMMANDS.RESERVAR_INSUMOS, OS, { itens: [{ insumoId: 'x', quantidade: 0 }] }),
      ),
    ).rejects.toBeInstanceOf(MensagemInvalidaError);
    expect(await tiposNaOutbox()).toEqual([]);
  });
});
