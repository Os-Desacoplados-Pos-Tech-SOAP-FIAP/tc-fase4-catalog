import { DomainError } from '../../shared/DomainError';
import { Reserva, StatusReserva } from './Reserva';

const OS = '7f2b2a8e-1d7c-4a35-9c1e-0a4f3b2c1d10';
const FILTRO = '11111111-1111-4111-8111-111111111111';
const OLEO = '22222222-2222-4222-8222-222222222222';

describe('Reserva', () => {
  it('nasce ATIVA com os itens informados', () => {
    const reserva = Reserva.criar(OS, [{ insumoId: FILTRO, quantidade: 1 }]);
    expect(reserva.status).toBe(StatusReserva.ATIVA);
    expect(reserva.osId).toBe(OS);
    expect(reserva.itens).toEqual([{ insumoId: FILTRO, quantidade: 1 }]);
  });

  it('agrupa itens repetidos do mesmo insumo', () => {
    const reserva = Reserva.criar(OS, [
      { insumoId: OLEO, quantidade: 2 },
      { insumoId: FILTRO, quantidade: 1 },
      { insumoId: OLEO, quantidade: 3 },
    ]);
    expect(reserva.itens).toEqual([
      { insumoId: OLEO, quantidade: 5 },
      { insumoId: FILTRO, quantidade: 1 },
    ]);
  });

  it('aceita OS sem insumos (só serviços)', () => {
    expect(Reserva.criar(OS, []).itens).toEqual([]);
  });

  it('rejeita OS vazia', () => {
    expect(() => Reserva.criar(' ', [])).toThrow(DomainError);
  });

  it.each([0, -1, 1.5])('rejeita quantidade %p', (quantidade) => {
    expect(() => Reserva.criar(OS, [{ insumoId: FILTRO, quantidade }])).toThrow(
      expect.objectContaining({ code: 'RESERVA_QUANTIDADE_INVALIDA' }),
    );
  });

  it('libera uma reserva ativa', () => {
    const reserva = Reserva.criar(OS, []);
    reserva.liberar();
    expect(reserva.status).toBe(StatusReserva.LIBERADA);
  });

  it('baixa uma reserva ativa', () => {
    const reserva = Reserva.criar(OS, []);
    reserva.baixar();
    expect(reserva.status).toBe(StatusReserva.BAIXADA);
  });

  it('não libera nem baixa reserva que não está ativa', () => {
    const reserva = Reserva.criar(OS, []);
    reserva.baixar();
    expect(() => reserva.liberar()).toThrow(expect.objectContaining({ code: 'RESERVA_NAO_ATIVA' }));
    expect(() => reserva.baixar()).toThrow(expect.objectContaining({ code: 'RESERVA_NAO_ATIVA' }));
  });

  it('itens expostos são cópia (encapsulamento)', () => {
    const reserva = Reserva.criar(OS, [{ insumoId: FILTRO, quantidade: 1 }]);
    reserva.itens.push({ insumoId: OLEO, quantidade: 9 });
    expect(reserva.itens).toHaveLength(1);
  });
});
