import { Injectable } from '@nestjs/common';
import { Insumo as InsumoRow, Prisma, TipoInsumo as TipoInsumoRow } from '@prisma/client';

import { Insumo, TipoInsumo } from '../../domain/insumo/entities/Insumo';
import { IInsumoLockingRepository } from '../../domain/insumo/repositories/IInsumoLockingRepository';
import { CodigoPeca } from '../../domain/insumo/value-objects/CodigoPeca';
import { Estoque } from '../../domain/insumo/value-objects/Estoque';
import { ValorUnitario } from '../../domain/insumo/value-objects/ValorUnitario';
import { UniqueID } from '../../domain/shared/UniqueID';
import { PrismaTransactionManager } from '../database/prisma-transaction.manager';

@Injectable()
export class PrismaInsumoRepository implements IInsumoLockingRepository {
  constructor(private readonly db: PrismaTransactionManager) {}

  private toDomain(row: InsumoRow): Insumo {
    return Insumo.restaurar(
      {
        codigo: CodigoPeca.create(row.codigo),
        nome: row.nome,
        tipo: row.tipo === TipoInsumoRow.PECA ? TipoInsumo.PECA : TipoInsumo.INSUMO,
        valorUnitario: ValorUnitario.create(Number(row.valorUnitario)),
        estoque: Estoque.create(row.quantidadeEstoque, row.quantidadeReservada),
        criadoEm: row.criadoEm,
        atualizadoEm: row.atualizadoEm,
      },
      new UniqueID(row.id),
    );
  }

  async salvar(insumo: Insumo): Promise<void> {
    const data = {
      codigo: insumo.codigo.value,
      nome: insumo.nome,
      tipo: insumo.tipo === TipoInsumo.PECA ? TipoInsumoRow.PECA : TipoInsumoRow.INSUMO,
      valorUnitario: insumo.valorUnitario.value,
      quantidadeEstoque: insumo.estoque.quantidade,
      quantidadeReservada: insumo.estoque.quantidadeReservada,
    };
    await this.db.client.insumo.upsert({
      where: { id: insumo.id.toValue() },
      create: { id: insumo.id.toValue(), ...data },
      update: data,
    });
    // Eventos de domínio do Insumo não são publicados: a integração usa a outbox.
    insumo.clearEvents();
  }

  async buscarPorId(id: UniqueID): Promise<Insumo | null> {
    const row = await this.db.client.insumo.findUnique({ where: { id: id.toValue() } });
    return row ? this.toDomain(row) : null;
  }

  async buscarPorCodigo(codigo: string): Promise<Insumo | null> {
    const row = await this.db.client.insumo.findUnique({
      where: { codigo: codigo.toUpperCase() },
    });
    return row ? this.toDomain(row) : null;
  }

  async listar(): Promise<Insumo[]> {
    const rows = await this.db.client.insumo.findMany({ orderBy: { nome: 'asc' } });
    return rows.map((row) => this.toDomain(row));
  }

  async buscarParaAtualizacao(ids: UniqueID[]): Promise<Insumo[]> {
    if (ids.length === 0) return [];
    const valores = ids.map((id) => id.toValue());
    // Ordem por id evita deadlock entre transações que travam os mesmos insumos.
    await this.db.client.$queryRaw`
      SELECT "id" FROM "Insumo" WHERE "id" IN (${Prisma.join(valores)}) ORDER BY "id" FOR UPDATE`;
    const rows = await this.db.client.insumo.findMany({ where: { id: { in: valores } } });
    return rows.map((row) => this.toDomain(row));
  }
}
