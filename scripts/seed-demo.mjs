/**
 * METROFLOW ERP — SEED DE DADOS DEMO
 * ====================================
 * Gera dados fictícios realistas na pasta mock-db-demo/
 * Totalmente isolado do mock-db/ (banco de dev) e do Firestore (produção).
 *
 * Uso:
 *   node scripts/seed-demo.mjs          → popula mock-db-demo/ com dados ficticios
 *   node scripts/seed-demo.mjs --reset  → limpa e repopula do zero
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DB = path.resolve(__dirname, '..', 'mock-db-demo');

// --------------------------------------------------------------------------
// HELPERS
// --------------------------------------------------------------------------
const write = (file, data) => {
  fs.writeFileSync(path.join(DEMO_DB, file), JSON.stringify(data, null, 2), 'utf8');
  console.log(`  ✔ ${file} (${data.length} registros)`);
};

if (!fs.existsSync(DEMO_DB)) fs.mkdirSync(DEMO_DB);

console.log('\n🌱 MetroFlow ERP — Seed de Dados Demo');
console.log('📁 Destino:', DEMO_DB);
console.log('─'.repeat(50));

// --------------------------------------------------------------------------
// CLIENTES (IDs de 3 dígitos, conforme regra do sistema)
// --------------------------------------------------------------------------
const clients = [
  {
    id: '001',
    razaoSocial: 'Indústria Metalúrgica Omega S.A.',
    nomeFantasia: 'Omega Metal',
    cnpj: '12.345.678/0001-90',
    email: 'qualidade@omegametal.ind.br',
    telefone: '(92) 3302-1100',
    enderecoPrincipal: 'Av. das Indústrias, 500 - Distrito Industrial - Manaus/AM',
    enderecoColeta: 'Av. das Indústrias, 500 - Galpão B - Manaus/AM',
    solicitanteNome: 'Carlos Mendonça',
    solicitanteEmail: 'c.mendonca@omegametal.ind.br',
    solicitanteContato: '(92) 99801-1234',
    emailFinanceiro: 'financeiro@omegametal.ind.br',
    emailCertificados: 'qualidade@omegametal.ind.br',
    retencaoImpostoFonte: false,
    restricaoPagamento: false,
    inscricaoMunicipal: '52.847-2',
    inscricaoEstadual: '06.100.005-4',
    status: 'Atualizado',
    funcionarioCadastro: 'Admin Demo'
  },
  {
    id: '002',
    razaoSocial: 'Petroquímica Amazônica Ltda',
    nomeFantasia: 'PetroAM',
    cnpj: '98.765.432/0001-10',
    email: 'contato@petroam.com.br',
    telefone: '(92) 3345-9900',
    enderecoPrincipal: 'Rod. AM-010, km 12 - Zona Rural - Manaus/AM',
    enderecoColeta: 'Rod. AM-010, km 12 - Laboratório Central',
    solicitanteNome: 'Ana Flávia Rodrigues',
    solicitanteEmail: 'a.rodrigues@petroam.com.br',
    solicitanteContato: '(92) 99712-5678',
    emailFinanceiro: 'ap@petroam.com.br',
    emailCertificados: 'lab@petroam.com.br',
    retencaoImpostoFonte: true,
    restricaoPagamento: false,
    inscricaoMunicipal: '71.234-8',
    inscricaoEstadual: '06.200.009-1',
    status: 'Atualizado',
    funcionarioCadastro: 'Admin Demo'
  },
  {
    id: '003',
    razaoSocial: 'Frigorífico Norte Alimentos S.A.',
    nomeFantasia: 'FrigoNorte',
    cnpj: '55.123.456/0001-33',
    email: 'rastreabilidade@frigonorte.com.br',
    telefone: '(92) 3298-7700',
    enderecoPrincipal: 'Rua das Acácias, 200 - Cidade Nova - Manaus/AM',
    enderecoColeta: 'Rua das Acácias, 200 - Setor de Pesagem',
    solicitanteNome: 'Roberto Alencar',
    solicitanteEmail: 'r.alencar@frigonorte.com.br',
    solicitanteContato: '(92) 99654-9900',
    emailFinanceiro: 'contas@frigonorte.com.br',
    emailCertificados: 'rastreabilidade@frigonorte.com.br',
    retencaoImpostoFonte: false,
    restricaoPagamento: false,
    inscricaoMunicipal: '38.901-5',
    inscricaoEstadual: '06.300.012-7',
    status: 'Atualizado',
    funcionarioCadastro: 'Admin Demo'
  },
  {
    id: '004',
    razaoSocial: 'Farmácia de Manipulação BioVital Ltda',
    nomeFantasia: 'BioVital',
    cnpj: '22.987.654/0001-77',
    email: 'bph@biovital.com.br',
    telefone: '(92) 3211-6600',
    enderecoPrincipal: 'Rua Recife, 890 - Adrianópolis - Manaus/AM',
    enderecoColeta: 'Rua Recife, 890 - Setor de Controle de Qualidade',
    solicitanteNome: 'Patrícia Lemos',
    solicitanteEmail: 'p.lemos@biovital.com.br',
    solicitanteContato: '(92) 99523-1122',
    emailFinanceiro: 'financeiro@biovital.com.br',
    emailCertificados: 'qualidade@biovital.com.br',
    retencaoImpostoFonte: true,
    restricaoPagamento: true,
    inscricaoMunicipal: '19.450-0',
    inscricaoEstadual: '06.400.021-3',
    status: 'Atualizado',
    funcionarioCadastro: 'Admin Demo'
  },
  {
    id: '005',
    razaoSocial: 'Construtora Horizonte AM Ltda',
    nomeFantasia: 'Horizonte AM',
    cnpj: '33.456.789/0001-55',
    email: 'engenharia@horizonteam.com.br',
    telefone: '(92) 3388-2200',
    enderecoPrincipal: 'Av. Mário Ypiranga, 3456 - Parque 10 - Manaus/AM',
    enderecoColeta: 'Av. Mário Ypiranga, 3456 - Almoxarifado',
    solicitanteNome: 'Fernando Guimarães',
    solicitanteEmail: 'f.guimaraes@horizonteam.com.br',
    solicitanteContato: '(92) 99811-3344',
    emailFinanceiro: 'pagar@horizonteam.com.br',
    emailCertificados: 'engenharia@horizonteam.com.br',
    retencaoImpostoFonte: false,
    restricaoPagamento: false,
    inscricaoMunicipal: '60.312-8',
    inscricaoEstadual: '06.500.030-9',
    status: 'NÃO ATUALIZADO',
    funcionarioCadastro: 'Admin Demo'
  }
];

// --------------------------------------------------------------------------
// INSTRUMENTOS PADRÃO
// --------------------------------------------------------------------------
const standard_instruments = [
  {
    id: 'std-001',
    nome: 'Bloco Padrão de Comprimento',
    identificacao: 'BPC-001',
    certificadoCalibracao: 'RBC-2025-0312',
    dataCalibracao: '2025-03-15',
    dataValidadeCalibracao: '2026-03-15',
    periodicidade: '12',
    orgaoCalibrador: 'INMETRO / DIMCI',
    resolucao: '0,001',
    unidadeMedida: 'mm',
    uncertainty: 0.0005,
    kFactor: 2.00,
    statusMovimentacao: 'Disponível'
  },
  {
    id: 'std-002',
    nome: 'Paquímetro Digital 150mm',
    identificacao: 'PAQ-001',
    certificadoCalibracao: 'RBC-2025-0198',
    dataCalibracao: '2025-02-10',
    dataValidadeCalibracao: '2026-02-10',
    periodicidade: '12',
    orgaoCalibrador: 'Mitutoyo Brasil',
    resolucao: '0,01',
    unidadeMedida: 'mm',
    uncertainty: 0.01,
    kFactor: 2.00,
    statusMovimentacao: 'Disponível'
  },
  {
    id: 'std-003',
    nome: 'Termômetro de Referência PT-100',
    identificacao: 'TEMP-001',
    certificadoCalibracao: 'RBC-2025-0455',
    dataCalibracao: '2025-04-01',
    dataValidadeCalibracao: '2026-04-01',
    periodicidade: '12',
    orgaoCalibrador: 'Labs RBC Amazonas',
    resolucao: '0,01',
    unidadeMedida: '°C',
    uncertainty: 0.05,
    kFactor: 2.00,
    statusMovimentacao: 'Disponível'
  },
  {
    id: 'std-004',
    nome: 'Micrômetro Externo 0-25mm',
    identificacao: 'MIC-001',
    certificadoCalibracao: 'RBC-2024-1022',
    dataCalibracao: '2024-10-20',
    dataValidadeCalibracao: '2025-10-20',
    periodicidade: '12',
    orgaoCalibrador: 'Mitutoyo Brasil',
    resolucao: '0,001',
    unidadeMedida: 'mm',
    uncertainty: 0.001,
    kFactor: 2.00,
    statusMovimentacao: 'Vencido'
  },
  {
    id: 'std-005',
    nome: 'Balança Analítica 220g',
    identificacao: 'BAL-001',
    certificadoCalibracao: 'RBC-2025-0677',
    dataCalibracao: '2025-01-20',
    dataValidadeCalibracao: '2026-01-20',
    periodicidade: '12',
    orgaoCalibrador: 'Shimadzu do Brasil',
    resolucao: '0,0001',
    unidadeMedida: 'g',
    uncertainty: 0.0002,
    kFactor: 2.00,
    statusMovimentacao: 'Em calibração'
  }
];

// --------------------------------------------------------------------------
// TABELAS DE PREÇO
// --------------------------------------------------------------------------
const price_tables = [
  {
    id: 'pt-2026',
    nome: '2026 — Tabela Padrão',
    ano: 2026,
    itens: [
      { id: 'item-001', descricao: 'Calibração de Paquímetro', tipoServico: 'Rastreável', local: 'Laboratório', valorBase: 180.00 },
      { id: 'item-002', descricao: 'Calibração de Micrômetro Externo', tipoServico: 'Rastreável', local: 'Laboratório', valorBase: 200.00 },
      { id: 'item-003', descricao: 'Calibração de Termômetro/Termopar', tipoServico: 'Rastreável', local: 'Laboratório', valorBase: 220.00 },
      { id: 'item-004', descricao: 'Calibração de Balança', tipoServico: 'Rastreável', local: 'Laboratório', valorBase: 280.00 },
      { id: 'item-005', descricao: 'Calibração de Manômetro', tipoServico: 'Rastreável', local: 'Campo', valorBase: 350.00 },
      { id: 'item-006', descricao: 'Calibração de Régua de Aço', tipoServico: 'Rastreável', local: 'Laboratório', valorBase: 150.00 },
      { id: 'item-007', descricao: 'Verificação de Trena', tipoServico: 'Verificação', local: 'Laboratório', valorBase: 120.00 },
      { id: 'item-008', descricao: 'Calibração de Nível de Bolha', tipoServico: 'Verificação', local: 'Laboratório', valorBase: 140.00 },
    ]
  }
];

// --------------------------------------------------------------------------
// ORÇAMENTOS
// --------------------------------------------------------------------------
const quotes = [
  {
    id: 'OCW041026',
    clienteId: '001',
    dataEmissao: '2026-04-01',
    validade: '2026-05-01',
    comissaoVendedor: false,
    tabelaPrecos: '2026 — Tabela Padrão',
    formaPagamento: '30 dias',
    items: [
      { item: 1, descricao: 'Calibração de Paquímetro', tipoServico: 'Rastreável', local: 'Laboratório', quantidade: 5, valorUnitario: 180.00, valorUnitarioFinal: 180.00, desconto: 0, valorTotal: 900.00 },
      { item: 2, descricao: 'Calibração de Micrômetro Externo', tipoServico: 'Rastreável', local: 'Laboratório', quantidade: 3, valorUnitario: 200.00, valorUnitarioFinal: 200.00, desconto: 0, valorTotal: 600.00 },
      { item: 3, descricao: 'Calibração de Termômetro/Termopar', tipoServico: 'Rastreável', local: 'Laboratório', quantidade: 2, valorUnitario: 220.00, valorUnitarioFinal: 220.00, desconto: 0, valorTotal: 440.00 }
    ],
    clienteCnpj: '12.345.678/0001-90',
    clienteEndereco: 'Av. das Indústrias, 500 - Distrito Industrial - Manaus/AM',
    clienteSolicitanteNome: 'Carlos Mendonça',
    clienteSolicitanteEmail: 'c.mendonca@omegametal.ind.br',
    clienteSolicitanteContato: '(92) 99801-1234',
    clienteEmailFinanceiro: 'financeiro@omegametal.ind.br',
    clienteRetencaoImpostoFonte: false,
    status: 'APPROVED',
    revision: 0,
    criadoPor: 'Admin Demo',
    criadoEm: '01/04/2026 08:00:00',
    observacoes: 'Instrumentos de produção da linha A. Urgente.'
  },
  {
    id: 'OCW041126',
    clienteId: '002',
    dataEmissao: '2026-04-08',
    validade: '2026-05-08',
    comissaoVendedor: true,
    tabelaPrecos: '2026 — Tabela Padrão',
    formaPagamento: 'À vista',
    items: [
      { item: 1, descricao: 'Calibração de Balança', tipoServico: 'Rastreável', local: 'Campo', quantidade: 4, valorUnitario: 280.00, valorUnitarioFinal: 280.00, desconto: 0, valorTotal: 1120.00 },
      { item: 2, descricao: 'Calibração de Manômetro', tipoServico: 'Rastreável', local: 'Campo', quantidade: 8, valorUnitario: 350.00, valorUnitarioFinal: 315.00, desconto: 10, valorTotal: 2520.00 }
    ],
    clienteCnpj: '98.765.432/0001-10',
    clienteEndereco: 'Rod. AM-010, km 12 - Zona Rural - Manaus/AM',
    clienteSolicitanteNome: 'Ana Flávia Rodrigues',
    clienteSolicitanteEmail: 'a.rodrigues@petroam.com.br',
    clienteSolicitanteContato: '(92) 99712-5678',
    clienteEmailFinanceiro: 'ap@petroam.com.br',
    clienteRetencaoImpostoFonte: true,
    status: 'APPROVED',
    revision: 0,
    criadoPor: 'Admin Demo',
    criadoEm: '08/04/2026 09:30:00',
    observacoes: 'Calibração em campo. Verificar disponibilidade de veículo.'
  },
  {
    id: 'OCW041226',
    clienteId: '003',
    dataEmissao: '2026-04-14',
    validade: '2026-05-14',
    comissaoVendedor: false,
    tabelaPrecos: '2026 — Tabela Padrão',
    formaPagamento: '15 dias',
    items: [
      { item: 1, descricao: 'Calibração de Balança', tipoServico: 'Rastreável', local: 'Laboratório', quantidade: 6, valorUnitario: 280.00, valorUnitarioFinal: 280.00, desconto: 0, valorTotal: 1680.00 },
      { item: 2, descricao: 'Verificação de Trena', tipoServico: 'Verificação', local: 'Laboratório', quantidade: 10, valorUnitario: 120.00, valorUnitarioFinal: 108.00, desconto: 10, valorTotal: 1080.00 }
    ],
    clienteCnpj: '55.123.456/0001-33',
    clienteEndereco: 'Rua das Acácias, 200 - Cidade Nova - Manaus/AM',
    clienteSolicitanteNome: 'Roberto Alencar',
    clienteSolicitanteEmail: 'r.alencar@frigonorte.com.br',
    clienteSolicitanteContato: '(92) 99654-9900',
    clienteEmailFinanceiro: 'contas@frigonorte.com.br',
    clienteRetencaoImpostoFonte: false,
    status: 'PENDING',
    revision: 0,
    criadoPor: 'Admin Demo',
    criadoEm: '14/04/2026 11:00:00',
    observacoes: 'Aguardando aprovação do cliente.'
  },
  {
    id: 'OCW041326',
    clienteId: '004',
    dataEmissao: '2026-04-18',
    validade: '2026-05-18',
    comissaoVendedor: false,
    tabelaPrecos: '2026 — Tabela Padrão',
    formaPagamento: '30 dias',
    items: [
      { item: 1, descricao: 'Calibração de Termômetro/Termopar', tipoServico: 'Rastreável', local: 'Laboratório', quantidade: 12, valorUnitario: 220.00, valorUnitarioFinal: 198.00, desconto: 10, valorTotal: 2376.00 }
    ],
    clienteCnpj: '22.987.654/0001-77',
    clienteEndereco: 'Rua Recife, 890 - Adrianópolis - Manaus/AM',
    clienteSolicitanteNome: 'Patrícia Lemos',
    clienteSolicitanteEmail: 'p.lemos@biovital.com.br',
    clienteSolicitanteContato: '(92) 99523-1122',
    clienteEmailFinanceiro: 'financeiro@biovital.com.br',
    clienteRetencaoImpostoFonte: true,
    status: 'PENDING',
    revision: 0,
    criadoPor: 'Admin Demo',
    criadoEm: '18/04/2026 14:20:00',
    observacoes: 'Termômetros da câmara fria e incubadoras — prioritário BPF.'
  }
];

// --------------------------------------------------------------------------
// ORDENS DE SERVIÇO (para os orçamentos aprovados)
// --------------------------------------------------------------------------
const service_orders = [
  {
    id: '26283',
    orcamentoId: 'OCW041026',
    clienteId: '001',
    dataEmissao: '2026-04-02T08:00:00.000Z',
    dataEntrada: '2026-04-03',
    dataSaida: '',
    responsavelEntrada: 'C.G. Moraes Neto',
    responsavelSaida: '',
    tecnicoExecutante: '',
    statusServico: 'Em Andamento',
    statusCertificado: 'Pendente',
    calibracaoConcluida: false,
    certificadosEnviados: false,
    observacoes: 'Instrumentos de produção linha A. Urgente.\n\n--- DADOS TÉCNICOS PREVISTOS ---\nPERIODICIDADE: Anual'
  },
  {
    id: '26284',
    orcamentoId: 'OCW041126',
    clienteId: '002',
    dataEmissao: '2026-04-09T09:30:00.000Z',
    dataEntrada: '2026-04-10',
    dataSaida: '2026-04-17',
    responsavelEntrada: 'C.G. Moraes Neto',
    responsavelSaida: 'C.G. Moraes Neto',
    tecnicoExecutante: 'C.G. Moraes Neto',
    statusServico: 'Entregue',
    statusCertificado: 'Emitido',
    calibracaoConcluida: true,
    certificadosEnviados: true,
    observacoes: 'Calibração em campo concluída. Certificados enviados por e-mail.'
  }
];

// --------------------------------------------------------------------------
// TIPOS DE INSTRUMENTO
// --------------------------------------------------------------------------
const instrument_types = [
  { id: 'it-001', nome: 'Paquímetro', categoria: 'Dimensional', unidade: 'mm' },
  { id: 'it-002', nome: 'Micrômetro', categoria: 'Dimensional', unidade: 'mm' },
  { id: 'it-003', nome: 'Termômetro', categoria: 'Temperatura', unidade: '°C' },
  { id: 'it-004', nome: 'Termopar', categoria: 'Temperatura', unidade: '°C' },
  { id: 'it-005', nome: 'Balança', categoria: 'Massa', unidade: 'g' },
  { id: 'it-006', nome: 'Manômetro', categoria: 'Pressão', unidade: 'bar' },
  { id: 'it-007', nome: 'Trena', categoria: 'Dimensional', unidade: 'm' },
  { id: 'it-008', nome: 'Nível de Bolha', categoria: 'Angular', unidade: 'mm/m' },
  { id: 'it-009', nome: 'Régua de Aço', categoria: 'Dimensional', unidade: 'mm' },
  { id: 'it-010', nome: 'Torquímetro', categoria: 'Torque', unidade: 'N.m' }
];

// --------------------------------------------------------------------------
// MÉTODOS DE PAGAMENTO
// --------------------------------------------------------------------------
const payment_methods = [
  { id: 'pm-001', nome: 'À vista' },
  { id: 'pm-002', nome: '15 dias' },
  { id: 'pm-003', nome: '30 dias' },
  { id: 'pm-004', nome: '30/60 dias' },
  { id: 'pm-005', nome: 'Boleto bancário' }
];

// --------------------------------------------------------------------------
// FUNCIONÁRIOS / USUÁRIO ADMINISTRADOR
// --------------------------------------------------------------------------
const employees = [
  {
    id: 'admin-1',
    nome: 'C.G. Moraes Neto',
    email: 'c.g.moraesneto@gmail.com',
    username: 'admin',
    password: '123456',
    cargo: 'Administrador do Sistema',
    role: 'Administrador',
    permissions: ['Dashboard', 'Clientes', 'Comercial', 'Logística', 'Técnico', 'Qualidade', 'Financeiro', 'Cadastros'],
    isSignatory: true,
    mustChangePassword: false
  },
  {
    id: 'emp-001',
    nome: 'Técnico Demo Silva',
    email: 'tecnico@demo.com',
    username: 'tecnico',
    password: '123456',
    cargo: 'Técnico Calibrador',
    role: 'Técnico',
    permissions: ['Dashboard', 'Técnico', 'Qualidade'],
    isSignatory: false,
    mustChangePassword: false
  }
];

// --------------------------------------------------------------------------
// CONTROLES FINANCEIROS (NFs vinculadas às OS entregues)
// --------------------------------------------------------------------------
const financial_controls = [
  {
    id: 'fin-001',
    numeroNF: 'NF-2026-0042',
    dataEmissao: '2026-04-18',
    serviceOrderId: '26284',
    clienteId: '002',
    valorBruto: 3640.00,
    valorLiquido: 3276.00,
    valorPendente: 0,
    statusPagamento: 'Pago',
    observacoes: 'Recebido via depósito bancário em 22/04/2026'
  }
];

// --------------------------------------------------------------------------
// PROCEDIMENTOS
// --------------------------------------------------------------------------
const procedures = [
  { id: 'proc-001', codigo: 'PQ-CAL-001', titulo: 'Calibração de Instrumentos Dimensionais', revisao: '03', dataAprovacao: '2025-01-10', status: 'Vigente' },
  { id: 'proc-002', codigo: 'PQ-CAL-002', titulo: 'Calibração de Termômetros e Sensores de Temperatura', revisao: '02', dataAprovacao: '2025-02-15', status: 'Vigente' },
  { id: 'proc-003', codigo: 'PQ-CAL-003', titulo: 'Calibração de Instrumentos de Massa (Balanças)', revisao: '01', dataAprovacao: '2025-03-20', status: 'Vigente' },
  { id: 'proc-004', codigo: 'PQ-CAL-004', titulo: 'Calibração de Manômetros e Pressostatos', revisao: '02', dataAprovacao: '2025-01-25', status: 'Vigente' }
];

// --------------------------------------------------------------------------
// BANCOS
// --------------------------------------------------------------------------
const banks = [
  { id: 'bank-001', nome: 'Banco do Brasil', agencia: '0001-9', conta: '12345-6', pix: 'cnpj@empresa.com' },
  { id: 'bank-002', nome: 'Itaú Unibanco', agencia: '0236', conta: '98765-4', pix: '' }
];

// --------------------------------------------------------------------------
// UNIDADES DE MEDIDA
// --------------------------------------------------------------------------
const units_of_measure = [
  { id: 'uom-001', simbolo: 'mm', nome: 'Milímetro', grandeza: 'Comprimento' },
  { id: 'uom-002', simbolo: 'm', nome: 'Metro', grandeza: 'Comprimento' },
  { id: 'uom-003', simbolo: '°C', nome: 'Grau Celsius', grandeza: 'Temperatura' },
  { id: 'uom-004', simbolo: 'g', nome: 'Grama', grandeza: 'Massa' },
  { id: 'uom-005', simbolo: 'kg', nome: 'Quilograma', grandeza: 'Massa' },
  { id: 'uom-006', simbolo: 'bar', nome: 'Bar', grandeza: 'Pressão' },
  { id: 'uom-007', simbolo: 'Pa', nome: 'Pascal', grandeza: 'Pressão' },
  { id: 'uom-008', simbolo: 'N.m', nome: 'Newton-metro', grandeza: 'Torque' },
  { id: 'uom-009', simbolo: 'mm/m', nome: 'Milímetro por metro', grandeza: 'Angular' }
];

// --------------------------------------------------------------------------
// VEÍCULOS
// --------------------------------------------------------------------------
const vehicles = [
  { id: 'veh-001', modelo: 'Fiat Fiorino (Carga)', placa: 'PXO-1A23', ano: 2022, kmAtual: 48320 },
  { id: 'veh-002', modelo: 'Renault Duster (Campo)', placa: 'BCD-9Z88', ano: 2021, kmAtual: 72100 }
];

// --------------------------------------------------------------------------
// COLEÇÕES VAZIAS (mantidas para compatibilidade com o sistema)
// --------------------------------------------------------------------------
const emptyCollections = [
  'audit_trails',
  'calibration_records',
  'calibration_results',
  'certificate_masks',
  'document_templates',
  'fleet_logs',
  'instrument_cards',
  'mask_versions',
  'standard_custodies',
  'standard_logs',
  'users'
];

// --------------------------------------------------------------------------
// ESCRITA
// --------------------------------------------------------------------------
write('clients.json', clients);
write('standard_instruments.json', standard_instruments);
write('price_tables.json', price_tables);
write('quotes.json', quotes);
write('service_orders.json', service_orders);
write('instrument_types.json', instrument_types);
write('payment_methods.json', payment_methods);
write('employees.json', employees);
write('financial_controls.json', financial_controls);
write('procedures.json', procedures);
write('banks.json', banks);
write('units_of_measure.json', units_of_measure);
write('vehicles.json', vehicles);

emptyCollections.forEach(col => {
  write(`${col}.json`, []);
});

console.log('\n✅ Dados demo gerados com sucesso!');
console.log('📌 Para usar no servidor de desenvolvimento, execute:');
console.log('   npm run dev:demo\n');
