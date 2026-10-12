import { NotFoundException } from '@nestjs/common';

export function ensureFound<T>(value: T | null | undefined, entidade: string): T {
  if (value === null || value === undefined) {
    throw new NotFoundException(`${entidade} não encontrado(a)`);
  }
  return value;
}
