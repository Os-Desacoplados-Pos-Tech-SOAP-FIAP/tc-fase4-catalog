import { Insumo } from '../../src/domain/insumo/entities/Insumo';
import { IInsumoLockingRepository } from '../../src/domain/insumo/repositories/IInsumoLockingRepository';
import { UniqueID } from '../../src/domain/shared/UniqueID';
import { ParticipanteTransacao } from './fake-transaction.manager';

function clonar(insumo: Insumo): Insumo {
  return Insumo.restaurar(
    {
      codigo: insumo.codigo,
      nome: insumo.nome,
      tipo: insumo.tipo,
      valorUnitario: insumo.valorUnitario,
      estoque: insumo.estoque,
      criadoEm: insumo.criadoEm,
      atualizadoEm: insumo.atualizadoEm,
    },
    insumo.id,
  );
}

export class InMemoryInsumoRepository implements IInsumoLockingRepository, ParticipanteTransacao {
  public insumos: Insumo[] = [];

  async salvar(insumo: Insumo): Promise<void> {
    const i = this.insumos.findIndex((x) => x.id.equals(insumo.id));
    if (i >= 0) this.insumos[i] = insumo;
    else this.insumos.push(insumo);
  }
  async buscarPorId(id: UniqueID): Promise<Insumo | null> {
    return this.insumos.find((x) => x.id.equals(id)) ?? null;
  }
  async buscarPorCodigo(codigo: string): Promise<Insumo | null> {
    return this.insumos.find((x) => x.codigo.value === codigo.toUpperCase()) ?? null;
  }
  async listar(): Promise<Insumo[]> {
    return this.insumos;
  }
  async buscarParaAtualizacao(ids: UniqueID[]): Promise<Insumo[]> {
    return this.insumos.filter((x) => ids.some((id) => id.equals(x.id)));
  }
  snapshot(): unknown {
    return this.insumos.map(clonar);
  }
  restaurar(estado: unknown): void {
    this.insumos = estado as Insumo[];
  }
}
