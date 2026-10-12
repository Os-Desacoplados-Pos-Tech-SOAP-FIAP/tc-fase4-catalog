import { PrismaClient, TipoInsumo } from '@prisma/client';

const prisma = new PrismaClient();

const SERVICOS = [
  { id: 'a1000000-0000-4000-8000-000000000001', nome: 'Troca de óleo', descricao: 'Troca de óleo e filtro do motor', valorPadrao: 120 },
  { id: 'a1000000-0000-4000-8000-000000000002', nome: 'Alinhamento e balanceamento', descricao: 'Alinhamento de direção e balanceamento das rodas', valorPadrao: 150 },
  { id: 'a1000000-0000-4000-8000-000000000003', nome: 'Revisão de freios', descricao: 'Inspeção e troca de pastilhas e fluido', valorPadrao: 200 },
];

const INSUMOS = [
  { id: 'b2000000-0000-4000-8000-000000000001', codigo: 'FIL-001', nome: 'Filtro de óleo', tipo: TipoInsumo.PECA, valorUnitario: 45, quantidadeEstoque: 20 },
  { id: 'b2000000-0000-4000-8000-000000000002', codigo: 'OLE-5W30', nome: 'Óleo 5W30 (litro)', tipo: TipoInsumo.INSUMO, valorUnitario: 60, quantidadeEstoque: 50 },
  // Estoque zerado de propósito: é o cenário (b) da saga — reserva falha e a OS é cancelada.
  { id: 'b2000000-0000-4000-8000-000000000003', codigo: 'PAS-001', nome: 'Pastilha de freio', tipo: TipoInsumo.PECA, valorUnitario: 180, quantidadeEstoque: 0 },
  { id: 'b2000000-0000-4000-8000-000000000004', codigo: 'FLU-DOT4', nome: 'Fluido de freio DOT4', tipo: TipoInsumo.INSUMO, valorUnitario: 40, quantidadeEstoque: 10 },
];

async function main(): Promise<void> {
  for (const servico of SERVICOS) {
    await prisma.servico.upsert({ where: { id: servico.id }, create: servico, update: {} });
  }
  for (const insumo of INSUMOS) {
    await prisma.insumo.upsert({ where: { id: insumo.id }, create: insumo, update: {} });
  }
  console.log(`seed: ${SERVICOS.length} serviços e ${INSUMOS.length} insumos`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
