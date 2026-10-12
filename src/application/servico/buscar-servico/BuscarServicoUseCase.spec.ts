import { NotFoundException } from '@nestjs/common';

import { Servico } from '../../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../../domain/servico/repositories/IServicoRepository';
import { UniqueID } from '../../../domain/shared/UniqueID';
import { BuscarServicoUseCase } from './BuscarServicoUseCase';

class InMemoryServicoRepository implements IServicoRepository {
  servicos: Servico[] = [];
  async salvar(s: Servico) { this.servicos.push(s); }
  async buscarPorId(id: UniqueID) { return this.servicos.find((s) => s.id.equals(id)) ?? null; }
  async listar() { return this.servicos; }
}

describe('BuscarServicoUseCase', () => {
  it('retorna o serviço pelo id', async () => {
    const repo = new InMemoryServicoRepository();
    const servico = Servico.criar({ nome: 'Troca de óleo', descricao: 'Motor', valorPadrao: 120 });
    await repo.salvar(servico);
    const resultado = await new BuscarServicoUseCase(repo).execute(servico.id.toValue());
    expect(resultado.id.equals(servico.id)).toBe(true);
  });

  it('lança 404 quando não existe', async () => {
    const useCase = new BuscarServicoUseCase(new InMemoryServicoRepository());
    await expect(useCase.execute('11111111-1111-4111-8111-111111111111')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
