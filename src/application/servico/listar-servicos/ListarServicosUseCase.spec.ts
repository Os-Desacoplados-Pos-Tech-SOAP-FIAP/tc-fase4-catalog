import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { ListarServicosUseCase } from './ListarServicosUseCase';

class InMemoryServicoRepository implements IServicoRepository {
  public servicos: Servico[] = [];
  async salvar(s: Servico) { this.servicos.push(s); }
  async buscarPorId(id: UniqueID) { return this.servicos.find(s => s.id.equals(id)) ?? null; }
  async listar() { return this.servicos; }
  async remover(id: UniqueID) { this.servicos = this.servicos.filter(s => !s.id.equals(id)); }
}

describe('ListarServicosUseCase', () => {
  it('retorna lista vazia', async () => {
    const useCase = new ListarServicosUseCase(new InMemoryServicoRepository());
    expect(await useCase.execute()).toHaveLength(0);
  });

  it('retorna serviços cadastrados', async () => {
    const repo = new InMemoryServicoRepository();
    repo.servicos.push(Servico.criar({ nome: 'Troca de Óleo', descricao: 'Desc', valorPadrao: 100 }));
    repo.servicos.push(Servico.criar({ nome: 'Alinhamento', descricao: 'Desc', valorPadrao: 80 }));
    const useCase = new ListarServicosUseCase(repo);
    expect(await useCase.execute()).toHaveLength(2);
  });
});
