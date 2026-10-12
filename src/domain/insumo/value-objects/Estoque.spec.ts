import { DomainError } from '../../shared/DomainError';
import { Estoque } from './Estoque';

describe('Estoque', () => {
  it('cria estoque válido', () => {
    const e = Estoque.create(10);
    expect(e.quantidade).toBe(10);
    expect(e.quantidadeReservada).toBe(0);
    expect(e.disponivel).toBe(10);
  });

  it('cria estoque com reserva inicial', () => {
    const e = Estoque.create(10, 3);
    expect(e.quantidadeReservada).toBe(3);
    expect(e.disponivel).toBe(7);
  });

  it('lança DomainError para quantidade negativa', () => {
    expect(() => Estoque.create(-1)).toThrow(DomainError);
  });

  it('lança DomainError para quantidade não inteira', () => {
    expect(() => Estoque.create(1.5)).toThrow(DomainError);
  });

  it('lança DomainError quando reserva inicial excede quantidade', () => {
    expect(() => Estoque.create(5, 6)).toThrow(DomainError);
  });

  it('baixa estoque retorna novo VO imutável', () => {
    const e = Estoque.create(10);
    const novo = e.baixar(3);
    expect(novo.quantidade).toBe(7);
    expect(e.quantidade).toBe(10);
  });

  it('lança DomainError em baixa com quantidade inválida', () => {
    const e = Estoque.create(10);
    expect(() => e.baixar(0)).toThrow(DomainError);
    expect(() => e.baixar(-1)).toThrow(DomainError);
  });

  it('baixa só usa estoque disponível (ignora reservado)', () => {
    const e = Estoque.create(10, 7);
    expect(() => e.baixar(5)).toThrow(DomainError);
    const ok = e.baixar(3);
    expect(ok.quantidade).toBe(7);
    expect(ok.quantidadeReservada).toBe(7);
  });

  it('repõe estoque preservando reserva', () => {
    const e = Estoque.create(5, 2);
    const novo = e.repor(3);
    expect(novo.quantidade).toBe(8);
    expect(novo.quantidadeReservada).toBe(2);
  });

  it('reservar aumenta reserva e reduz disponível', () => {
    const e = Estoque.create(10);
    const novo = e.reservar(4);
    expect(novo.quantidadeReservada).toBe(4);
    expect(novo.disponivel).toBe(6);
  });

  it('lança DomainError ao reservar mais que disponível', () => {
    const e = Estoque.create(5, 3);
    expect(() => e.reservar(3)).toThrow(DomainError);
  });

  it('liberarReserva devolve ao disponível', () => {
    const e = Estoque.create(10, 6);
    const novo = e.liberarReserva(4);
    expect(novo.quantidadeReservada).toBe(2);
    expect(novo.disponivel).toBe(8);
    expect(novo.quantidade).toBe(10);
  });

  it('lança DomainError ao liberar mais do que está reservado', () => {
    const e = Estoque.create(10, 2);
    expect(() => e.liberarReserva(3)).toThrow(DomainError);
  });

  it('consumirReserva reduz quantidade e reserva', () => {
    const e = Estoque.create(10, 6);
    const novo = e.consumirReserva(4);
    expect(novo.quantidade).toBe(6);
    expect(novo.quantidadeReservada).toBe(2);
  });

  it('lança DomainError ao consumir mais do que está reservado', () => {
    const e = Estoque.create(10, 2);
    expect(() => e.consumirReserva(3)).toThrow(DomainError);
  });
});
