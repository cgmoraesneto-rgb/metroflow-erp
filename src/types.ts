// src/types.ts

export enum ClientStatus {
  NOT_UPDATED = "NÃO ATUALIZADO",
  UPDATED = "ATUALIZADO",
}

export interface Client {
  id: string;
  razaoSocial: string;
  cnpj: string;
  enderecoPrincipal: string;
  enderecoColeta: string;
  solicitanteNome: string;
  solicitanteEmail: string;
  solicitanteContato: string;
  emailFinanceiro: string;
  emailCertificados: string;
  retencaoImpostoFonte: boolean;
  status: ClientStatus;
  restricaoPagamento: boolean;
  funcionarioCadastro: string;
  senha?: string; // Para portal do cliente
  inscricaoMunicipal?: string;
  inscricaoEstadual?: string;
  dataLimiteNF?: string;
}

export interface DocumentTemplate {
  id: string; 
  name: string; 
  applyTo?: string;
  letterheadBase64?: string;
  accreditedLetterheadBase64?: string;
  footerBase64?: string;
  commercialConditions?: string;
  technicalInformation?: string;
  generalConditions?: string;
  serviceOrderTerms?: string;
}

export interface QuoteItem {
  item: number;
  descricao: string;
  quantidade: number;
  tipoServico: string;
  local: string;
  valorUnitario: number;
  valorTotal: number;
  desconto: number; // Desconto em porcentagem (ex: 10 para 10%)
  valorUnitarioFinal: number; // Valor Unitário após o desconto
}

export enum QuoteStatus {
  PENDING = "Pendente",
  APPROVED = "Aprovado",
  REJECTED = "Reprovado",
}

export interface Quote {
  id: string;
  clienteId: string;
  dataEmissao: string;
  validade: string;
  comissaoVendedor: boolean;
  nomeComissionado?: string;
  tabelaPrecos: string;
  formaPagamento: string;
  items: QuoteItem[];
  clienteCnpj: string;
  clienteEndereco: string;
  clienteSolicitanteNome: string;
  clienteSolicitanteEmail: string;
  clienteSolicitanteContato: string;
  clienteEmailFinanceiro: string;
  clienteRetencaoImpostoFonte: boolean;
  status?: QuoteStatus;
  observacoes?: string;
  parentQuoteId?: string; // NEW: Identification of the original quote
  revision?: number;      // NEW: Revision number (0 = original)
  criadoPor?: string;
  criadoEm?: string;
}

export enum InstrumentStatus {
  PENDING = "Pendente",
  IN_PROGRESS = "Em andamento",
  CALIBRATED = "Calibrado",
  COMPLETED = "Concluído",
  DELIVERED = "Entregue",
}

export enum CertificateStatus {
  PENDING = "Pendente",
  IN_ANALYSIS = "Em Análise",
  APPROVED = "Aprovado",
  REJECTED = "Rejeitado",
  BEING_MADE = "Em confecção",
  READY_FOR_SENDING = "Apto para Envio",
  RETURNED = "Devolvido para correção",
}

export enum UserRole {
  ADMIN = "Administrador",
  TECNICO = "Técnico",
  REVISOR = "Revisor de Qualidade",
  RESPONSAVEL_TECNICO = "Responsável Técnico Superior"
}

export interface AuditTrail {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityId: string;
  entityType: string;
  timestamp: string;
  previousState?: any;
  newState?: any;
  justification?: string;
}

export interface InstrumentCard {
  id: string;
  clientId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  identification: string;
  instrumentType: string;
  resolution?: number;
  measurementRange?: string;
  firstReceivedDate: string;
}

export interface StandardInstrumentLog {
  id: string;
  standardInstrumentId: string;
  calibrationRecordId: string;
  dateUsed: string;
  validityAtUse: string;
  withinValidity: boolean;
}

export interface CalibrationResult {
  id: string;
  calibrationRecordId: string;
  groups: CalibrationGroupRecord[];
  // Intermediate calculation storage
  calculatedPoints?: Record<string, CalibrationPointResult>; // key: groupName-rowIndex
  standardInstrumentUncertainties?: StandardInstrumentUncertainty[];
  resolution?: number;
}

export interface CalibrationPointResult {
  mean: number;
  error: number;
  stdDev: number;
  uA: number;
  uB_res: number;
  uB_pad: number;
  uC: number;
  k: number;
  kMethod: 'standard' | 'tStudent';
  veff?: number;
  U: number;
  result: string; // "Ī ± U"
  conformity: 'Aprovado' | 'Reprovado' | 'Sem Tolerância';
  vvc: number;
  readings: number[];
  trace?: ExecutionTrace; // Phase 3: Forensic Audit
}

export interface ServiceOrder {
  id: string;
  orcamentoId: string;
  clienteId: string;
  dataEmissao?: string; // Data de Emissão da O.S. (Automática)
  dataEntrada: string; // Data de Entrada dos Instrumentos (Manual)
  dataSaida: string;
  responsavelEntrada: string;
  responsavelSaida: string;
  tecnicoExecutante: string;
  statusServico: InstrumentStatus;
  statusCertificado: CertificateStatus;
  isCertificateSent?: boolean;
  calibracaoConcluida?: boolean;
  certificadosEnviados?: boolean;
  observacoes?: string;
  // Campos detalhados de logística (5 pares data/responsável)
  dataEntradaReal?: string;
  responsavelRecebimento?: string;
  dataCalibracaoFim?: string;
  responsavelCalibracao?: string;
  dataRegistro?: string;
  responsavelRegistro?: string;
  dataEnvioCertificado?: string;
  responsavelEnvioCertificado?: string;
  dataSaidaReal?: string;
  responsavelSaidaReal?: string;
}

export interface CustodyItem {
  standardInstrumentId: string;
  quantidade: number;
}

export interface StandardCustody {
  id: string;
  items: CustodyItem[];
  origem: string;
  responsavelOrigem: string;
  destino: string;
  responsavelDestino: string;
  dataSaida: string;
  dataRetorno?: string;
  responsavel: string;
}

export interface Vehicle {
  id: string;
  placa: string;
  modelo: string;
}

export interface FleetLog {
  id: string;
  motorista: string;
  veiculoId: string;
  trajetoDescricao: string;
  dataSaida: string;
  dataRetorno?: string;
  kmInicial: number;
  kmFinal?: number;
}

export interface StandardInstrument {
  id?: string;
  nome: string;
  identificacao: string;
  certificadoCalibracao: string;
  certificadoPdf?: string;
  dataCalibracao: string; // YYYY-MM-DD
  orgaoCalibrador: string;
  periodicidade: string;
  dataValidadeCalibracao: string;
  traceabilityChain?: string[]; // Phase 3: ISO 17025
  resolucao: string;
  uncertainty?: number;
  kFactor?: number; // Fator de abrangência (Metrológico)
  unidadeMedida: string;
  statusMovimentacao: 'Disponível' | 'Vencido' | 'Em calibração' | 'Em manutenção' | 'Emprestado';
}

export interface UncertaintyCalculationResult {
  mediaLeituras: number;
  erroTendencia: number;
  incertezaTipoA: number;
  incertezaTipoB1: number; // Instrumento/Resolução
  incertezaTipoB2: number; // Incerteza do Padrão
  incertezaCombinada: number;
  incertezaExpandida: number;
  kFactor: number;
}

export interface CalibrationPoint {
  referenceValue: number;
  readings: [number, number, number];
  error: number;
  uncertainty: number;
}

export type CellValue = number | number[] | string | null;

export type RowData = Record<string, CellValue>; // key = column.id

export interface CalibrationRow extends RowData {}

export interface ExecutionTrace {
  [columnId: string]: {
    formula: string;
    dependencies: string[];
    inputs: Record<string, CellValue>;
    output: CellValue;
    executionIndex: number;
    timestamp: number;
  };
}

export interface ExecutionResult {
  values: Record<string, CellValue>;
  errors: Record<string, string>;
  trace?: ExecutionTrace;
}

export interface CalibrationGroupRecord {
  groupName: string;
  name?: string;       // alias for groupName used in modal/template display
  columns?: string[];  // column names for this group
  columnDefinitions?: ColumnDefinition[]; // NEW: Detailed column metadata
  hiddenColumns?: string[]; // columns hidden in the client certificate
  formulas?: Record<string, string>; // formula definitions per column
  rows: CalibrationRow[];
  blockId?: string; // LOGICAL BLOCK ID (e.g. A, B, C)
  isDynamic?: boolean; // If rows can be added/removed
}

export interface CalibrationRecord {
  id: string;
  serviceOrderId: string;
  clientId?: string;
  quoteItemIndex?: number;
  unitIndex?: number;
  instrumentName: string;
  certificateNumber: string;
  isAccredited?: boolean;
  calibrationDate: string;
  nextCalibrationDate: string;
  technicianName: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  identification: string;
  periodicity: string;
  calibrationLocation: string;
  resolution?: number;
  measurementRange?: string;
  capacidadeMinima?: string;
  capacidadeMaxima?: string;
  unidadeMedida?: string;
  temperature: number;
  humidity: number;
  envStandardInstrumentId: string;
  environmentalStandardId: string;
  certificateMaskId?: string; // Legacy
  maskVersionId?: string; // New: immutable snapshot
  instrumentCardId?: string; // New: link to permanent card
  procedureId: string;
  standardInstrumentIds: string[];
  observations: string;
  attachments?: string[]; // Array of base64 images for annexes
  groups?: CalibrationGroupRecord[]; // Legacy, moving to CalibrationResult
  calculatedPoints?: Record<string, CalibrationPointResult>; // Final calculated values
  standardInstrumentUncertainties?: StandardInstrumentUncertainty[];
  status?: CertificateStatus;
  kFactorJustification?: 'Padrão (k=2 para 95.45%)' | 'Welch-Satterthwaite';
  submittedBy?: string;
  l1ApproverId?: string;
  l2ApproverId?: string;
  signatarioId?: string; // Novo campo para assinar explicitamente o certificado
  returnJustification?: string;
  // 2-step calibration flow
  isDraft?: boolean;
  maskSnapshot?: CertificateMask;
  headerSaved?: boolean;
  headerValidated?: boolean;
  // Certificate revision
  revisionOf?: string;
  revisionNumber?: number;
  isPublished?: boolean; // Para portal do cliente
  revisionRequested?: boolean; // Cliente solicitou revisão
  revisionReason?: string; // Motivo da solicitação de revisão
  revisionRequestedAt?: string; // ISO timestamp
  isCancelled?: boolean; // Cancelado/despublicado pelo laboratório
  justificationForNonConformity?: string; // Phase 3: ISO 17025
  
  // Phase 4: Accreditation & Legal Hardening
  executionSnapshot?: ExecutionSnapshot;
  engineVersion?: string;
  componentVersions?: {
    calculationEngine: string;
    metrologyEngine: string;
    formulaParser: string;
    complianceEngine: string;
  };
  
  // Phase 4.6: Approval Workflow
  signedBy?: string[]; // IDs of signers (Tech, Reviewer, Approver)
  approvedAt?: string; // ISO final sign-off

  // Data Integrity: Snapshot of standards used at the time of calibration
  standardInstrumentsSnapshot?: StandardInstrument[];
  envStandardInstrumentSnapshot?: StandardInstrument;
}

export interface ExecutionSnapshot {
  rowData: Record<string, CellValue>;
  computedValues: Record<string, number>;
  executionOrder: string[];
  formulas: Record<string, string>;
  timestamp: string; // ISO
  hash: string; // SHA-256
}

export enum PaymentStatus {
  PENDING = "Pendente",
  PAID = "Pago",
  OVERDUE = "Atrasado",
}

export interface FinancialControl {
  id?: string;
  numeroNF: string;
  dataEmissao: string;
  valorBruto: number;
  percentualImposto?: number;
  impostosRetidos: number;
  desconto: number;
  valorLiquido: number;
  dataPagamento?: string;
  dataPagamentoReal?: string;
  formaPagamento: string;
  banco: string;
  comissao: number;
  percentualComissao?: number;
  statusComissao?: 'Pendente' | 'Pago';
  statusPagamento: PaymentStatus;
  clienteId: string;
  orcamentoId: string;
  serviceOrderId: string;
}

export interface PriceTableItem {
  id: string;
  nomeInstrumento: string; // Nome do Instrumento
  valorRastreavel: number;
  valorAcreditado: number;
  manutencao: number;
  ensaio: number;
  teste: number;
  qualificacao: number;
  logistica: number;
}

export interface PriceTable {
  id: string;
  nome: string;
  items: PriceTableItem[];
}

export enum Module {
  DASHBOARD = "Dashboard",
  COMMERCIAL = "Comercial",
  LOGISTICS = "Logística",
  TECHNICAL = "Técnico",
  QUALITY = "Qualidade",
  FINANCE = "Financeiro",
  REGISTRY = "Cadastros",
}

export interface Employee {
  id: string;
  nome: string;
  username?: string;
  cargo: string;
  email: string;
  telefone: string;
  permissions: Module[];
  role?: UserRole;
  isSignatory?: boolean;
  password?: string; // Para acesso ao sistema
  signatureBase64?: string; // Assinatura digital do colaborador (imagem base64)
  mustChangePassword?: boolean; // Obriga troca de senha no primeiro login
  
  // Phase 4
  roles?: ('TECHNICIAN' | 'REVIEWER' | 'APPROVER' | 'ADMIN')[];
  digitalCertificateId?: string;
}

export interface Bank {
  id: string;
  nome: string;
  codigo: string;
  agencia: string;
  conta: string;
}

export interface UnitOfMeasure {
  id: string;
  nome: string;
  simbolo: string;
}

export interface InstrumentType {
  id: string;
  name: string;
}

export interface TechnicalProcedure {
  id: string;
  name: string;
  content: string;
  referenceStandardIds: string[];
}

export enum ColumnType {
  VVC = "VVC",
  LEITURA = "LEITURA",
  MEDIA = "MEDIA",
  ERRO = "ERRO",
  DESVIO_PADRAO = "DESVIO_PADRAO",
  INCERTEZA = "INCERTEZA",
  CONFORMIDADE = "CONFORMIDADE",
  TEXTO = "TEXTO",
  NUMBER = "NUMBER"
}

export enum ColumnBehavior {
  INPUT = "INPUT",
  MANUAL = "MANUAL",
  CALCULATED = "CALCULATED",
  DERIVED = "DERIVED",
  METROLOGY = "METROLOGY"
}

export type MetrologyField = 
  | 'U' 
  | 'k' 
  | 'uC' 
  | 'uA' 
  | 'uB_res' 
  | 'uB_pad' 
  | 'veff' 
  | 'error' 
  | 'mean' 
  | 'stdDev' 
  | 'conformity';

export interface MetrologyValue {
  value: number | string;
  precision?: number;
  unit?: string;
  formatted?: string;
}

export interface ColumnDefinition {
  id: string; // Immutable unique ID (uuid)
  name: string;
  type: ColumnType;
  behavior: ColumnBehavior; // Required behavior control
  metrologyField?: MetrologyField; // Field from metrology engine
  formula?: string; // Excel-like formula
  decimalPlaces?: number;
  displayFormat?: string;
}

export interface MeasurementGroup {
  name: string;
  columns?: string[]; // Keep for legacy compatibility if needed, but we'll use definitions
  columnDefinitions?: ColumnDefinition[];
  hiddenColumns?: string[];
  formulas?: Record<string, string>;
  hasGraph?: boolean;
  graphType?: 'error_curve' | 'uncertainty_band';
  numberOfPoints?: number;  // Per-group override
  repetitions?: number;     // Per-group override
  blockId?: string;
  isDynamic?: boolean;
}

export interface StandardInstrumentUncertainty {
  instrumentId: string;
  declaredU: number;
  certificateK: number;
}

export interface CertificateMask {
  id: string;
  title: string;
  description?: string;
  procedureId: string;
  standardInstrumentIds: string[];
  standardInstrumentUncertainties?: StandardInstrumentUncertainty[];
  measurementGroups: MeasurementGroup[];
  instrumentType?: string;
  type?: 'CALIBRATION_CERTIFICATE' | 'TEST_REPORT' | 'MAINTENANCE_REPORT'; // NEW: Document Type
  measuredQuantity?: string;
  unit?: string;
  numberOfPoints?: number;
  repetitions?: number;
  optionalFields?: {
    hysteresis?: boolean;
    fiducialError?: boolean;
    conformityDeclaration?: boolean;
  };
  isActive?: boolean;
  version?: number;
  validityMonths?: number; // Para cálculo automático no PDF
  createdAt?: string;
  updatedAt?: string;
  updatedBy?: string;
  uncertaintyBudget?: any[];
}

export interface MaskVersion extends CertificateMask {
  versionId: string;
  originalMaskId: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  description: string;
}

export interface AuditLog {
  id: string;
  entityType: 'MASK' | 'CALIBRATION' | 'CERTIFICATE';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXECUTE';
  userId: string;
  userName: string;
  timestamp: number;
  before?: any;
  after?: any;
  previousHash: string;
  hash: string;
  
  // Phase 4
  ipAddress?: string;
  sessionId?: string;
}

export interface DigitalSignature {
  id: string;
  documentId: string; // certificateRecordId or maskId
  documentType: 'CERTIFICATE' | 'TEST_REPORT';
  signedBy: string; // userId
  userName: string;
  role: 'TECHNICIAN' | 'REVIEWER' | 'APPROVER' | 'ADMIN';
  signature: string; // Base64
  publicKey: string; // Public key reference or PEM
  timestamp: number;
  documentHash: string;
  
  // Phase 4: ICP-Brasil / ISO 17025 Hardening
  certificateInfo?: {
    certificatePem: string;
    issuer: string;
    serialNumber: string;
    validFrom: string;
    validTo: string;
  };
  trustedTimestamp?: {
    timestampToken: string;
    timestampAuthority: string;
    timestampHash: string;
  };
}

export interface Procedure {
  id: string;
  code?: string;
  title: string;
  content: string;
}
