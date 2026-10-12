import { Insumo, TipoInsumo } from '../../../domain/insumo/entities/Insumo';
import { StatusReserva } from '../../../domain/reserva/entities/Reserva';
import { FakeTransactionManager } from '../../../../test/fakes/fake-transaction.manager';
import { InMemoryInsumoRepository } from '../../../../test/fakes/in-memory-insumo.repository';
import { InMemoryOutbox } from '../../../../test/fakes/in-memory-outbox';
import { InMemoryProcessedMessageRepository } from '../../../../test/fakes/in-memory-processed-message.repository';
import { InMemoryReservaRepository } from '../../../../test/fakes/in-memory-reserva.repository';
import { CATALOG_EVENTS } from '../catalog-messages';
import { ReservarInsumosUseCase } from './ReservarInsumosUseCase';

const OS = '7f2b2a8e-1d7c-4a35-9c1e-0a4f3b2c1d10';

describe('ReservarInsumosUseCase', () => {
  let insumos: InMemoryInsumoRepository;
  let reservas: InMemoryReservaRepository;
  let processadas: InMemoryProcessedMessageRepository;
  let outbox: InMemoryOutbox;
  let useCase: ReservarInsumosUseCase;
  let filtro: Insumo;
  let oleo: Insumo;

  beforeEach(async () => {
    insumos = new InMemoryInsumoRepository();
    reservas = new InMemoryReservaRepository();
    processadas = new InMemoryProcessedMessageRepository();
    outbox = new InMemoryOutbox();
    const transacao = new FakeTransactionManager().participar(insumos, reservas, processadas, outbox);
    useCase = new ReservarInsumosUseCase(transacao, processadas, insumos, reservas, outbox);
    filtro = Insumo.criar({ codigo: 'FIL-001', nome: 'Filtro', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 2 });
    oleo = Insumo.criar({ codigo: 'OLE-5W30', nome: 'Óleo', tipo: TipoInsumo.INSUMO, valorUnitario: 60, quantidadeEstoque: 10 });
    await insumos.salvar(filtro);
    await insumos.salvar(oleo);
  });

  const comando = (itens: { insumoId: string; quantidade: number }[], messageId = 'cmd-1') => ({
    messageId,
    correlationId: OS,
    itens,
  });

  it('reserva todos os itens e publica insumos-reservados', async () => {
    await useCase.execute(comando([
      { insumoId: filtro.id.toValue(), quantidade: 1 },
      { insumoId: oleo.id.toValue(), quantidade: 4 },
    ]));

    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidadeReservada).toBe(1);
    expect((await insumos.buscarPorId(oleo.id))!.estoque.quantidadeReservada).toBe(4);
    const reserva = await reservas.buscarAtivaPorOs(OS);
    expect(reserva!.status).toBe(StatusReserva.ATIVA);
    expect(outbox.mensagens).toHaveLength(1);
    expect(outbox.mensagens[0]).toMatchObject({
      type: CATALOG_EVENTS.INSUMOS_RESERVADOS,
      correlationId: OS,
      causationId: 'cmd-1',
      payload: { osId: OS, reservaId: reserva!.id.toValue() },
    });
  });

  it('é tudo ou nada: sem estoque de um item, nada fica reservado e publica a falha', async () => {
    await useCase.execute(comando([
      { insumoId: oleo.id.toValue(), quantidade: 4 },
      { insumoId: filtro.id.toValue(), quantidade: 3 },
    ]));

    expect((await insumos.buscarPorId(oleo.id))!.estoque.quantidadeReservada).toBe(0);
    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidadeReservada).toBe(0);
    expect(await reservas.buscarAtivaPorOs(OS)).toBeNull();
    expect(outbox.mensagens).toHaveLength(1);
    expect(outbox.mensagens[0]).toMatchObject({
      type: CATALOG_EVENTS.RESERVA_INSUMOS_FALHOU,
      payload: { osId: OS, motivo: 'ESTOQUE_INSUFICIENTE' },
    });
    expect(processadas.ids.has('cmd-1')).toBe(true);
  });

  it('publica falha quando o insumo não existe', async () => {
    await useCase.execute(comando([{ insumoId: '99999999-9999-4999-8999-999999999999', quantidade: 1 }]));
    expect(outbox.mensagens[0]).toMatchObject({
      type: CATALOG_EVENTS.RESERVA_INSUMOS_FALHOU,
      payload: { motivo: 'INSUMO_NAO_ENCONTRADO' },
    });
  });

  it('publica falha quando o id do insumo é inválido', async () => {
    await useCase.execute(comando([{ insumoId: 'nao-e-uuid', quantidade: 1 }]));
    expect(outbox.mensagens[0].payload).toMatchObject({ motivo: 'INVALID_ID' });
  });

  it('OS sem insumos gera reserva vazia e sucesso', async () => {
    await useCase.execute(comando([]));
    expect(outbox.tipos()).toEqual([CATALOG_EVENTS.INSUMOS_RESERVADOS]);
  });

  it('é idempotente por messageId', async () => {
    const cmd = comando([{ insumoId: filtro.id.toValue(), quantidade: 1 }]);
    await useCase.execute(cmd);
    await useCase.execute(cmd);
    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidadeReservada).toBe(1);
    expect(outbox.mensagens).toHaveLength(1);
  });

  it('comando repetido com outro messageId reaproveita a reserva ativa', async () => {
    await useCase.execute(comando([{ insumoId: filtro.id.toValue(), quantidade: 1 }], 'cmd-1'));
    await useCase.execute(comando([{ insumoId: filtro.id.toValue(), quantidade: 1 }], 'cmd-2'));
    expect((await insumos.buscarPorId(filtro.id))!.estoque.quantidadeReservada).toBe(1);
    expect(outbox.tipos()).toEqual([
      CATALOG_EVENTS.INSUMOS_RESERVADOS,
      CATALOG_EVENTS.INSUMOS_RESERVADOS,
    ]);
  });

  it('falha repetida também é idempotente', async () => {
    const cmd = comando([{ insumoId: filtro.id.toValue(), quantidade: 99 }]);
    await useCase.execute(cmd);
    await useCase.execute(cmd);
    expect(outbox.mensagens).toHaveLength(1);
  });

  it('propaga erro que não é de domínio (infra) para a mensagem ser retentada', async () => {
    jest.spyOn(reservas, 'salvar').mockRejectedValueOnce(new Error('conexão perdida'));
    await expect(
      useCase.execute(comando([{ insumoId: filtro.id.toValue(), quantidade: 1 }])),
    ).rejects.toThrow('conexão perdida');
    expect(outbox.mensagens).toHaveLength(0);
    expect(processadas.ids.size).toBe(0);
  });
});
