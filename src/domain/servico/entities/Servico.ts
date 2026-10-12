import { AggregateRoot } from '../../shared/AggregateRoot';
import { DomainError } from '../../shared/DomainError';
import { EntityProps } from '../../shared/Entity';
import { UniqueID } from '../../shared/UniqueID';
import { ValorPadrao } from '../value-objects/ValorPadrao';

export interface ServicoProps extends EntityProps {
  nome: string;
  descricao: string;
  valorPadrao: ValorPadrao;
  ativo: boolean;
}

export interface NovoServicoInput {
  nome: string;
  descricao: string;
  valorPadrao: number;
  ativo?: boolean;
}

export class Servico extends AggregateRoot<ServicoProps> {
  private constructor(props: ServicoProps, id?: UniqueID) {
    super(props, id);
  }

  public static criar(input: NovoServicoInput): Servico {
    if (!input.nome || input.nome.trim().length < 2) {
      throw new DomainError('Nome do serviço inválido', 'SERVICO_NOME_INVALIDO');
    }
    return new Servico({
      nome: input.nome.trim(),
      descricao: (input.descricao ?? '').trim(),
      valorPadrao: ValorPadrao.create(input.valorPadrao),
      ativo: input.ativo ?? true,
    });
  }

  public static restaurar(props: ServicoProps, id: UniqueID): Servico {
    return new Servico(props, id);
  }

  public get nome(): string {
    return this.props.nome;
  }
  public get descricao(): string {
    return this.props.descricao;
  }
  public get valorPadrao(): ValorPadrao {
    return this.props.valorPadrao;
  }
  public get ativo(): boolean {
    return this.props.ativo;
  }

  public atualizar(input: Partial<NovoServicoInput>): void {
    if (input.nome !== undefined) {
      if (input.nome.trim().length < 2) {
        throw new DomainError('Nome do serviço inválido', 'SERVICO_NOME_INVALIDO');
      }
      this.props.nome = input.nome.trim();
    }
    if (input.descricao !== undefined) this.props.descricao = input.descricao.trim();
    if (input.valorPadrao !== undefined) {
      this.props.valorPadrao = ValorPadrao.create(input.valorPadrao);
    }
    if (input.ativo !== undefined) this.props.ativo = input.ativo;
    this.touch();
  }

  public inativar(): void {
    this.props.ativo = false;
    this.touch();
  }
}
