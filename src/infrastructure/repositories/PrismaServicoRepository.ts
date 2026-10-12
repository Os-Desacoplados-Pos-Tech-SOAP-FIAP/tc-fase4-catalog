import { Injectable } from '@nestjs/common';
import { Servico as ServicoRow } from '@prisma/client';

import { Servico } from '../../domain/servico/entities/Servico';
import { IServicoRepository } from '../../domain/servico/repositories/IServicoRepository';
import { ValorPadrao } from '../../domain/servico/value-objects/ValorPadrao';
import { UniqueID } from '../../domain/shared/UniqueID';
import { PrismaTransactionManager } from '../database/prisma-transaction.manager';

@Injectable()
export class PrismaServicoRepository implements IServicoRepository {
  constructor(private readonly db: PrismaTransactionManager) {}

  private toDomain(row: ServicoRow): Servico {
    return Servico.restaurar(
      {
        nome: row.nome,
        descricao: row.descricao,
        valorPadrao: ValorPadrao.create(Number(row.valorPadrao)),
        ativo: row.ativo,
        criadoEm: row.criadoEm,
        atualizadoEm: row.atualizadoEm,
      },
      new UniqueID(row.id),
    );
  }

  async salvar(servico: Servico): Promise<void> {
    const data = {
      nome: servico.nome,
      descricao: servico.descricao,
      valorPadrao: servico.valorPadrao.value,
      ativo: servico.ativo,
    };
    await this.db.client.servico.upsert({
      where: { id: servico.id.toValue() },
      create: { id: servico.id.toValue(), ...data },
      update: data,
    });
  }

  async buscarPorId(id: UniqueID): Promise<Servico | null> {
    const row = await this.db.client.servico.findUnique({ where: { id: id.toValue() } });
    return row ? this.toDomain(row) : null;
  }

  async listar(): Promise<Servico[]> {
    const rows = await this.db.client.servico.findMany({ orderBy: { nome: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }
}
