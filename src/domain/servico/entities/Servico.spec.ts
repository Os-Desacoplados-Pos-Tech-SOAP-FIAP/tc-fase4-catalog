import { DomainError } from '../../shared/DomainError';
import { Servico } from './Servico';

describe('Servico', () => {
  const input = { nome: 'Troca de Óleo', descricao: 'Troca completa', valorPadrao: 120 };

  it('cria serviço com dados válidos', () => {
    const s = Servico.criar(input);
    expect(s.nome).toBe('Troca de Óleo');
    expect(s.valorPadrao.value).toBe(120);
    expect(s.ativo).toBe(true);
  });

  it('cria com ativo=false', () => {
    const s = Servico.criar({ ...input, ativo: false });
    expect(s.ativo).toBe(false);
  });

  it('lança DomainError para nome curto', () => {
    expect(() => Servico.criar({ ...input, nome: 'A' })).toThrow(DomainError);
  });

  it('atualiza nome, valor e ativo', () => {
    const s = Servico.criar(input);
    s.atualizar({ nome: 'Alinhamento', valorPadrao: 80, ativo: false });
    expect(s.nome).toBe('Alinhamento');
    expect(s.valorPadrao.value).toBe(80);
    expect(s.ativo).toBe(false);
  });

  it('lança DomainError ao atualizar com nome curto', () => {
    const s = Servico.criar(input);
    expect(() => s.atualizar({ nome: 'A' })).toThrow(DomainError);
  });

  it('inativa serviço', () => {
    const s = Servico.criar(input);
    s.inativar();
    expect(s.ativo).toBe(false);
  });
});
