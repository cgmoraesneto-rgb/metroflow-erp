import { z } from 'zod';
import { ClientStatus, QuoteStatus, InstrumentStatus, CertificateStatus, PaymentStatus, ColumnType, ColumnBehavior } from './types';

// --- Shared / Common ---
export const IdSchema = z.string().min(1);

// --- Clientes ---
export const ClientSchema = z.object({
  id: z.string().optional(),
  razaoSocial: z.string().min(1, 'Razão Social é obrigatória'),
  cnpj: z.string().optional(),
  enderecoPrincipal: z.string().optional(),
  enderecoColeta: z.string().optional(),
  solicitanteNome: z.string().optional(),
  solicitanteEmail: z.string().optional(),
  solicitanteContato: z.string().optional(),
  emailFinanceiro: z.string().optional(),
  emailCertificados: z.string().optional(),
  retencaoImpostoFonte: z.boolean().optional(),
  status: z.nativeEnum(ClientStatus).optional(),
  restricaoPagamento: z.boolean().optional(),
  funcionarioCadastro: z.string().optional(),
  senha: z.string().optional(),
  inscricaoMunicipal: z.string().optional(),
  inscricaoEstadual: z.string().optional(),
});

export type ClientFormData = z.infer<typeof ClientSchema>;

// --- Comercial ---
export const QuoteItemSchema = z.object({
  item: z.number(),
  descricao: z.string().min(1, 'Descrição do item é obrigatória'),
  quantidade: z.number().min(1, 'Quantidade deve ser pelo menos 1'),
  tipoServico: z.string().optional().default(''),
  local: z.string().optional().default('Laboratório'),
  valorUnitario: z.number().nonnegative(),
  valorTotal: z.number().nonnegative(),
  desconto: z.number().optional().default(0),
  valorUnitarioFinal: z.number().optional().default(0),
});

export const QuoteSchema = z.object({
  id: z.string().min(1, 'ID do orçamento é obrigatório'),
  clienteId: z.string().min(1, 'Cliente é obrigatório'),
  dataEmissao: z.string(),
  validade: z.string(),
  comissaoVendedor: z.boolean().optional().default(false),
  tabelaPrecos: z.string().optional().default(''),
  formaPagamento: z.string().optional().default(''),
  items: z.array(QuoteItemSchema).default([]),
  status: z.nativeEnum(QuoteStatus).optional().default(QuoteStatus.PENDING),
  clienteCnpj: z.string().optional().default(''),
  clienteEndereco: z.string().optional().default(''),
  clienteSolicitanteNome: z.string().optional().default(''),
  clienteSolicitanteEmail: z.string().optional().default(''),
  clienteSolicitanteContato: z.string().optional().default(''),
  clienteEmailFinanceiro: z.string().optional().default(''),
  clienteRetencaoImpostoFonte: z.boolean().optional().default(false),
  observacoes: z.string().optional().default(''),
  parentQuoteId: z.string().optional(),
  revision: z.number().optional().default(0),
});

// --- Técnico ---
export const ServiceOrderSchema = z.object({
  id: z.string().min(1, 'ID da O.S. é obrigatório'),
  orcamentoId: z.string(),
  clienteId: z.string(),
  dataEmissao: z.string().optional(),
  dataEntrada: z.string(),
  dataSaida: z.string().optional().default(''),
  responsavelEntrada: z.string().optional().default(''),
  responsavelSaida: z.string().optional().default(''),
  tecnicoExecutante: z.string().optional().default(''),
  statusServico: z.nativeEnum(InstrumentStatus).optional().default(InstrumentStatus.PENDING),
  statusCertificado: z.nativeEnum(CertificateStatus).optional().default(CertificateStatus.PENDING),
  calibracaoConcluida: z.boolean().optional().default(false),
  certificadosEnviados: z.boolean().optional().default(false),
  observacoes: z.string().optional().default(''),
});

export const StandardInstrumentSchema = z.object({
  id: z.string().optional(),
  nome: z.string().min(1, 'Nome do padrão é obrigatório'),
  identificacao: z.string().min(1, 'Identificação é obrigatória'),
  certificadoCalibracao: z.string().optional().default(''),
  dataCalibracao: z.string().optional().default(''),
  dataValidadeCalibracao: z.string(),
  periodicidade: z.string().optional().default(''),
  orgaoCalibrador: z.string().optional().default(''),
  resolucao: z.string().optional().default(''),
  uncertainty: z.number().optional().default(0),
  unidadeMedida: z.string().optional().default(''),
  statusMovimentacao: z.string().optional().default('Disponível'),
  procedureId: z.string().optional(),
});

export const ColumnDefinitionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.nativeEnum(ColumnType),
  behavior: z.nativeEnum(ColumnBehavior).optional(),
  metrologyField: z.string().optional(),
  formula: z.string().optional(),
});

export const MeasurementGroupSchema = z.object({
  name: z.string().min(1),
  columns: z.array(z.string()).optional(),
  columnDefinitions: z.array(ColumnDefinitionSchema).optional(),
  hiddenColumns: z.array(z.string()).optional(),
  formulas: z.record(z.string(), z.string()).optional(),
});

export const CertificateMaskSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  procedureId: z.string().min(1),
  standardInstrumentIds: z.array(z.string()),
  measurementGroups: z.array(MeasurementGroupSchema),
  instrumentType: z.string().optional(),
  type: z.enum(['CALIBRATION_CERTIFICATE', 'TEST_REPORT']).optional(),
  numberOfPoints: z.number().min(1).optional(),
  repetitions: z.number().min(3).optional(),
  isActive: z.boolean().optional(),
});

// --- Financeiro ---
export const FinancialControlSchema = z.object({
  id: z.string().optional(),
  numeroNF: z.string().optional().default(''),
  dataEmissao: z.string(),
  valorBruto: z.number().nonnegative(),
  valorLiquido: z.number().nonnegative(),
  valorPendente: z.number().optional().default(0),
  statusPagamento: z.nativeEnum(PaymentStatus).optional().default(PaymentStatus.PENDING),
  clienteId: z.string().min(1),
  orcamentoId: z.string().optional().default(''),
  serviceOrderId: z.string().optional().default(''),
  impostosRetidos: z.number().optional().default(0),
  desconto: z.number().optional().default(0),
  formaPagamento: z.string().optional().default(''),
  banco: z.string().optional().default(''),
  comissao: z.number().optional().default(0),
});

// --- Logística ---
export const FleetLogSchema = z.object({
  id: z.string().optional(),
  motorista: z.string().min(1),
  veiculoId: z.string().min(1),
  trajetoDescricao: z.string().optional().default(''),
  dataSaida: z.string(),
  kmInicial: z.number().nonnegative(),
  kmFinal: z.number().optional(),
  dataRetorno: z.string().optional(),
});

