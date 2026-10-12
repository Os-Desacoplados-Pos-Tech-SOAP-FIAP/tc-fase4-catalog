import { NotFoundException } from '@nestjs/common';

import { ensureFound } from './ensure-found';

describe('ensureFound', () => {
  it('retorna o valor quando não é null/undefined', () => {
    expect(ensureFound('x', 'Item')).toBe('x');
    expect(ensureFound(0, 'Item')).toBe(0);
    expect(ensureFound(false, 'Item')).toBe(false);
  });

  it('lança NotFoundException quando null', () => {
    expect(() => ensureFound(null, 'Cliente')).toThrow(NotFoundException);
    expect(() => ensureFound(null, 'Cliente')).toThrow('Cliente não encontrado(a)');
  });

  it('lança NotFoundException quando undefined', () => {
    expect(() => ensureFound(undefined, 'OS')).toThrow(NotFoundException);
  });
});
