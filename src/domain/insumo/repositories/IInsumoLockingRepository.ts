import { UniqueID } from '../../shared/UniqueID';
import { Insumo } from '../entities/Insumo';
import { IInsumoRepository } from './IInsumoRepository';

/**
 * Repositório com bloqueio pessimista, usado pelas operações de reserva/baixa
 * para que duas OS não reservem o mesmo saldo ao mesmo tempo.
 */
export interface IInsumoLockingRepository extends IInsumoRepository {
  /** Carrega os insumos travando as linhas até o fim da transação corrente. */
  buscarParaAtualizacao(ids: UniqueID[]): Promise<Insumo[]>;
}
