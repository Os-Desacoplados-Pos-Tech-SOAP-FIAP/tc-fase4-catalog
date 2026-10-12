import { Insumo } from '../../domain/insumo/entities/Insumo';
import { DomainError } from '../../domain/shared/DomainError';

export function localizarInsumo(insumos: Insumo[], insumoId: string): Insumo {
  const insumo = insumos.find((i) => i.id.toValue() === insumoId);
  if (!insumo) {
    throw new DomainError(`Insumo ${insumoId} não encontrado`, 'INSUMO_NAO_ENCONTRADO');
  }
  return insumo;
}
