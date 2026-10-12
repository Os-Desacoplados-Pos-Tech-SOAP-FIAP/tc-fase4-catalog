import { UniqueID } from '../../shared/UniqueID';
import { Servico } from '../entities/Servico';

export interface IServicoRepository {
  salvar(servico: Servico): Promise<void>;
  buscarPorId(id: UniqueID): Promise<Servico | null>;
  listar(): Promise<Servico[]>;
}
