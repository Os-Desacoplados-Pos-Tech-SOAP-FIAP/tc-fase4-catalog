import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { Reserva, StatusReserva } from '../../../domain/reserva/entities/Reserva';
import { FakeTransactionManager } from '../../../../test/fakes/fake-transaction.manager';
import { InMemoryInsumoRepository } from '../../../../test/fakes/in-memory-insumo.repository';
import { InMemoryOutbox } from '../../../../test/fakes/in-memory-outbox';
import { InMemoryProcessedMessageRepository } from '../../../../test/fakes/in-memory-processed-message.repository';
import { InMemoryReservaRepository } from '../../../../test/fakes/in-memory-reserva.repository';
import { CATALOG_EVENTS } from '../catalog-messages';
import { LiberarReservasUseCase } from './LiberarReservasUseCase';

const OS = '7f2b2a8e-1d7c-4a35-9c1e-0a4f3b2c1d10';

describe('LiberarReservasUseCase', () => {
  let insumos: InMemoryInsumoRepository;
  let reservas: InMemoryReservaRepository;
  let processadas: InMemoryProcessedMessageRepository;
  let outbox: InMemoryOutbox;
  let useCase: LiberarReservasUseCase;
  let filtro: Insumo;

  beforeEach(async () => {
    insumos = new InMemoryInsumoRepository();
    reservas = new InMemoryReservaRepository();
    processadas = new InMemoryProcessedMessageRepository();
    outbox = new InMemoryOutbox();
    const transacao = new FakeTransactionManager().participar(insumos, reservas, processadas, outbox);
    useCase = new LiberarReservasUseCase(transacao, processadas, insumos, reservas, outbox);
    filtro = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 5 });
    filtro.reservar(2);
    await insumos.salvar(filtro);
    await reservas.salvar(Reserva.criar(OS, [{ insumoId: filtro.id.toValue(), quantidade: 2 }]));
  });

  it('devolve o saldo, marca a reserva LIBERADA e publica reservas-liberadas', async () => {
    await useCase.execute({ messageId: 'cmp-1', correlationId: OS });
    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidadeReservada).toBe(0);
    expect((await reservas.listarPorOs(OS))[0].status).toBe(StatusReserva.LIBERADA);
    expect(outbox.mensagens[0]).toMatchObject({
      type: CATALOG_EVENTS.RESERVAS_LIBERADAS,
      payload: { osId: OS },
      causationId: 'cmp-1',
    });
  });

  it('sem reserva ativa, só confirma (compensação idempotente)', async () => {
    await useCase.execute({ messageId: 'cmp-1', correlationId: 'outra-os' });
    expect(outbox.tipos()).toEqual([CATALOG_EVENTS.RESERVAS_LIBERADAS]);
  });

  it('mensagem repetida não libera duas vezes', async () => {
    await useCase.execute({ messageId: 'cmp-1', correlationId: OS });
    await useCase.execute({ messageId: 'cmp-1', correlationId: OS });
    expect(outbox.mensagens).toHaveLength(1);
  });
});
