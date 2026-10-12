import { UniqueID } from '../../shared/UniqueID';
import { Insumo } from '../entities/Insumo';

export interface IInsumoRepository {
  salvar(insumo: Insumo): Promise<void>;
  buscarPorId(id: UniqueID): Promise<Insumo | null>;
  buscarPorCodigo(codigo: string): Promise<Insumo | null>;
  listar(): Promise<Insumo[]>;
}
