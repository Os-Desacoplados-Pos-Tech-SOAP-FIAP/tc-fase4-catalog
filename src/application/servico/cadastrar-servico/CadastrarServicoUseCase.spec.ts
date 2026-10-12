import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { CadastrarServicoUseCase } from './CadastrarServicoUseCase';

class InMemoryServicoRepository implements IServicoRepository {
  public servicos: Servico[] = [];
  async salvar(s: Servico) { this.servicos.push(s); }
  async buscarPorId(id: UniqueID) { return this.servicos.find(s => s.id.equals(id)) ?? null; }
  async listar() { return this.servicos; }
  async remover(id: UniqueID) { this.servicos = this.servicos.filter(s => !s.id.equals(id)); }
}

describe('CadastrarServicoUseCase', () => {
  it('cadastra serviço válido', async () => {
    const repo = new InMemoryServicoRepository();
    const useCase = new CadastrarServicoUseCase(repo);
    const s = await useCase.execute({ nome: 'Troca de Óleo', descricao: 'Completo', valorPadrao: 120 });
    expect(s.nome).toBe('Troca de Óleo');
    expect(repo.servicos).toHaveLength(1);
  });

  it('lança DomainError para nome inválido', async () => {
    const repo = new InMemoryServicoRepository();
    const useCase = new CadastrarServicoUseCase(repo);
    await expect(useCase.execute({ nome: 'A', descricao: '', valorPadrao: 0 })).rejects.toThrow();
  });
});
