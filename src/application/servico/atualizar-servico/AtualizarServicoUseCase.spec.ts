import { NotFoundException } from '@nestjs/common';

import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { AtualizarServicoUseCase } from './AtualizarServicoUseCase';

class InMemoryServicoRepository implements IServicoRepository {
  public servicos: Servico[] = [];
  async salvar(s: Servico) { const i = this.servicos.findIndex(x => x.id.equals(s.id)); if (i >= 0) this.servicos[i] = s; else this.servicos.push(s); }
  async buscarPorId(id: UniqueID) { return this.servicos.find(s => s.id.equals(id)) ?? null; }
  async listar() { return this.servicos; }
  async remover(id: UniqueID) { this.servicos = this.servicos.filter(s => !s.id.equals(id)); }
}

describe('AtualizarServicoUseCase', () => {
  let repo: InMemoryServicoRepository;
  let useCase: AtualizarServicoUseCase;
  let servico: Servico;

  beforeEach(() => {
    repo = new InMemoryServicoRepository();
    useCase = new AtualizarServicoUseCase(repo);
    servico = Servico.criar({ nome: 'Troca de Óleo', descricao: 'Desc', valorPadrao: 100 });
    repo.servicos.push(servico);
  });

  it('atualiza nome e valor', async () => {
    const result = await useCase.execute({ id: servico.id.toValue(), nome: 'Alinhamento', valorPadrao: 80 });
    expect(result.nome).toBe('Alinhamento');
    expect(result.valorPadrao.value).toBe(80);
  });

  it('lança NotFoundException para serviço inexistente', async () => {
    await expect(useCase.execute({ id: new UniqueID().toValue(), nome: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
