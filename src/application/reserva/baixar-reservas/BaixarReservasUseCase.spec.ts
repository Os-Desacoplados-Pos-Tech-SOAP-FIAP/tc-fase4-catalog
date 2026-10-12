import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { Reserva, StatusReserva } from '../../../domain/reserva/entities/Reserva';
import { FakeTransactionManager } from '../../../../test/fakes/fake-transaction.manager';
import { InMemoryInsumoRepository } from '../../../../test/fakes/in-memory-insumo.repository';
import { InMemoryOutbox } from '../../../../test/fakes/in-memory-outbox';
import { InMemoryProcessedMessageRepository } from '../../../../test/fakes/in-memory-processed-message.repository';
import { InMemoryReservaRepository } from '../../../../test/fakes/in-memory-reserva.repository';
import { CATALOG_EVENTS } from '../catalog-messages';
import { BaixarReservasUseCase } from './BaixarReservasUseCase';

const OS = '7f2b2a8e-1d7c-4a35-9c1e-0a4f3b2c1d10';

describe('BaixarReservasUseCase', () => {
  let insumos: InMemoryInsumoRepository;
  let reservas: InMemoryReservaRepository;
  let processadas: InMemoryProcessedMessageRepository;
  let outbox: InMemoryOutbox;
  let useCase: BaixarReservasUseCase;
  let filtro: Insumo;

  beforeEach(async () => {
    insumos = new InMemoryInsumoRepository();
    reservas = new InMemoryReservaRepository();
    processadas = new InMemoryProcessedMessageRepository();
    outbox = new InMemoryOutbox();
    const transacao = new FakeTransactionManager().participar(insumos, reservas, processadas, outbox);
    useCase = new BaixarReservasUseCase(transacao, processadas, insumos, reservas, outbox);
    filtro = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 5 });
    filtro.reservar(2);
    await insumos.salvar(filtro);
    await reservas.salvar(Reserva.criar(OS, [{ insumoId: filtro.id.toValue(), quantidade: 2 }]));
  });

  it('consome a reserva do estoque e publica estoque-baixado com os itens', async () => {
    await useCase.execute({ messageId: 'cmd-9', correlationId: OS });
    const estoque = (await insumos.buscarPorId(filtro.id))!.estoque;
    expect(estoque.quantidade).toBe(3);
    expect(estoque.quantidadeReservada).toBe(0);
    expect((await reservas.listarPorOs(OS))[0].status).toBe(StatusReserva.BAIXADA);
    expect(outbox.mensagens[0]).toMatchObject({
      type: CATALOG_EVENTS.ESTOQUE_BAIXADO,
      payload: { osId: OS, itens: [{ insumoId: filtro.id.toValue(), quantidade: 2 }] },
    });
  });

  it('sem reserva ativa publica estoque-baixado sem itens', async () => {
    await useCase.execute({ messageId: 'cmd-9', correlationId: 'os-sem-insumos' });
    expect(outbox.mensagens[0].payload).toEqual({ osId: 'os-sem-insumos', itens: [] });
  });

  it('mensagem repetida não baixa duas vezes', async () => {
    await useCase.execute({ messageId: 'cmd-9', correlationId: OS });
    await useCase.execute({ messageId: 'cmd-9', correlationId: OS });
    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidade).toBe(3);
  });
});
