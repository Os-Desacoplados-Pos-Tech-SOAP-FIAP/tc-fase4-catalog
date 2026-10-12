import { DomainError } from '../../shared/DomainError';
import { Insumo, TipoInsumo } from './Insumo';

const base = {
  codigo: 'FIL-001',
  nome: 'Filtro de Óleo',
  tipo: TipoInsumo.PECA,
  valorUnitario: 45,
  quantidadeEstoque: 10,
};

describe('Insumo', () => {
  it('cria insumo válido', () => {
    const p = Insumo.criar(base);
    expect(p.nome).toBe('Filtro de Óleo');
    expect(p.estoque.quantidade).toBe(10);
    expect(p.estoque.quantidadeReservada).toBe(0);
  });

  it('lança DomainError para nome curto', () => {
    expect(() => Insumo.criar({ ...base, nome: 'A' })).toThrow(DomainError);
  });

  it('baixa estoque corretamente', () => {
    const p = Insumo.criar(base);
    p.baixarEstoque(3);
    expect(p.estoque.quantidade).toBe(7);
  });

  it('lança DomainError em baixa maior que disponível', () => {
    const p = Insumo.criar(base);
    expect(() => p.baixarEstoque(20)).toThrow(DomainError);
  });

  it('emite evento EstoqueBaixado ao baixar', () => {
    const p = Insumo.criar(base);
    p.baixarEstoque(2);
    const eventNames = p.domainEvents.map((e) => e.constructor.name);
    expect(eventNames).toContain('EstoqueBaixado');
  });

  it('repõe estoque', () => {
    const p = Insumo.criar(base);
    p.reporEstoque(5);
    expect(p.estoque.quantidade).toBe(15);
  });

  it('atualiza valor unitário', () => {
    const p = Insumo.criar(base);
    p.atualizarValor(99);
    expect(p.valorUnitario.value).toBe(99);
  });

  it('atualiza estoque mantendo reserva', () => {
    const p = Insumo.criar({ ...base, quantidadeReservada: 2 });
    p.atualizarEstoque(20);
    expect(p.estoque.quantidade).toBe(20);
    expect(p.estoque.quantidadeReservada).toBe(2);
  });

  it('reserva, libera e consome reserva', () => {
    const p = Insumo.criar(base);
    p.reservar(4);
    expect(p.estoque.quantidadeReservada).toBe(4);
    expect(p.estoque.disponivel).toBe(6);
    p.liberarReserva(1);
    expect(p.estoque.quantidadeReservada).toBe(3);
    p.consumirReserva(2);
    expect(p.estoque.quantidade).toBe(8);
    expect(p.estoque.quantidadeReservada).toBe(1);
  });
});
