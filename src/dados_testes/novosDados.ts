import { Client, Quote, StandardInstrument, ServiceOrder, CalibrationRecord, FinancialControl, Employee, PriceTable, Procedure, CertificateMask, PaymentMethod, ClientStatus, InstrumentStatus, CertificateStatus, PaymentStatus, Module, QuoteStatus, StandardCustody, FleetLog, Vehicle } from '../types';

export const testClients: Client[] = [
  {
    id: 'CLI-001',
    razaoSocial: 'TechCorp Solutions Brasil LTDA',
    cnpj: '11.222.333/0001-44',
    enderecoPrincipal: 'Av. Inovação, 500 - Empreendimentos, Campinas - SP',
    enderecoColeta: 'Av. Inovação, 500 - Galpão Logístico',
    solicitanteNome: 'Fernanda Lima',
    solicitanteEmail: 'fernanda@techcorp.com.br',
    solicitanteContato: '(19) 98888-7777',
    emailFinanceiro: 'nfe@techcorp.com.br',
    emailCertificados: 'qualidade@techcorp.com.br',
    retencaoImpostoFonte: true,
    status: ClientStatus.UPDATED,
    restricaoPagamento: false,
    funcionarioCadastro: 'Sistema',
    senha: 'tech' // Senha para login no portal
  },
  {
    id: 'CLI-002',
    razaoSocial: 'BioLab Análises Químicas S.A',
    cnpj: '55.666.777/0001-88',
    enderecoPrincipal: 'Rua dos Laboratórios, 120 - Saúde, São Paulo - SP',
    enderecoColeta: 'Rua dos Laboratórios, 120 - Recepção Técnica',
    solicitanteNome: 'Dr. Roberto Almeida',
    solicitanteEmail: 'roberto@biolab.com.br',
    solicitanteContato: '(11) 91111-2222',
    emailFinanceiro: 'financeiro@biolab.com.br',
    emailCertificados: 'certificados@biolab.com.br',
    retencaoImpostoFonte: false,
    status: ClientStatus.UPDATED,
    restricaoPagamento: false,
    funcionarioCadastro: 'Sistema',
    senha: 'bio'
  }
];

export const testPriceTables: PriceTable[] = [
  {
    id: 'TAB-TEST-01',
    nome: 'Tabela de Serviços 2026',
    items: [
      {
        id: 'PT-01',
        nomeInstrumento: 'Multímetro Digital',
        valorRastreavel: 150.00,
        valorAcreditado: 250.00,
        manutencao: 50.00,
        ensaio: 0,
        teste: 0,
        qualificacao: 0
      },
      {
        id: 'PT-02',
        nomeInstrumento: 'Paquímetro Analógico/Digital',
        valorRastreavel: 80.00,
        valorAcreditado: 120.00,
        manutencao: 30.00,
        ensaio: 0,
        teste: 0,
        qualificacao: 0
      }
    ]
  }
];

export const testStandardInstruments: StandardInstrument[] = [
  {
    id: 'PAD-TEST-01',
    nome: 'Calibrador Multifunção Escala Alta',
    identificacao: 'CM-001',
    certificadoCalibracao: 'CERT-RBC-999',
    dataCalibracao: '2025-10-01',
    orgaoCalibrador: 'Laboratório RBC Delta',
    periodicidade: '24',
    dataValidadeCalibracao: '2027-10-01',
    resolucao: '0.001',
    unidadeMedida: 'V / A / Ohm',
    statusMovimentacao: 'Disponível',
    certificadoPdf: 'cert_cm001.pdf',
    traceabilityChain: []
  },
  {
    id: 'PAD-TEST-02',
    nome: 'Bloco Padrão Jogo 32 Peças',
    identificacao: 'BP-032',
    certificadoCalibracao: 'CERT-INMETRO-777',
    dataCalibracao: '2025-05-15',
    orgaoCalibrador: 'INMETRO',
    periodicidade: '12',
    dataValidadeCalibracao: '2026-05-15',
    resolucao: '0.0001',
    unidadeMedida: 'mm',
    statusMovimentacao: 'Disponível',
    certificadoPdf: 'cert_bp032.pdf',
    traceabilityChain: []
  }
];

export const testProcedures: Procedure[] = [
  {
    id: 'PROC-TEST-01',
    title: 'PR-TEST-01 - Calibração Elétrica',
    content: '1. Estabilização do equipamento por 30 minutos.\n2. Conexão das pontas de prova.\n3. Medição de Tensão, Corrente e Resistência em 5 pontos ascendentes e descendentes.'
  },
  {
    id: 'PROC-TEST-02',
    title: 'PR-TEST-02 - Dimensional Básico',
    content: '1. Limpeza das faces de medição.\n2. Verificação do zero do equipamento.\n3. Medição com blocos padrão nos pontos indicados na máscara.'
  }
];

export const testCertificateMasks: CertificateMask[] = [
  {
    id: 'MASK-TEST-01',
    title: 'Máscara - Multímetro Digital',
    procedureId: 'PROC-TEST-01',
    standardInstrumentIds: ['PAD-TEST-01'],
    measurementGroups: [
      {
        name: 'Tensão Contínua (VDC)',
        columns: ['Valor Nominal (V)', 'Valor Indicado (V)', 'Erro (V)', 'Incerteza Expandida (V)'],
        columnDefinitions: [
            { id: 'vvc', name: 'Valor Nominal (V)', type: 'VVC' as any, behavior: 'INPUT' as any },
            { id: 'leitura', name: 'Valor Indicado (V)', type: 'LEITURA' as any, behavior: 'INPUT' as any },
            { id: 'erro', name: 'Erro (V)', type: 'ERRO' as any, behavior: 'CALCULATED' as any, metrologyField: 'error' },
            { id: 'incerteza', name: 'Incerteza Expandida (V)', type: 'INCERTEZA' as any, behavior: 'CALCULATED' as any, metrologyField: 'U' }
        ],
        hasGraph: true,
        graphType: 'uncertainty_band'
      }
    ]
  },
  {
    id: 'MASK-TEST-02',
    title: 'Máscara - Paquímetro',
    procedureId: 'PROC-TEST-02',
    standardInstrumentIds: ['PAD-TEST-02'],
    measurementGroups: [
      {
        name: 'Medição Externa',
        columns: ['Valor de Referência (mm)', 'Indicação do Instrumento (mm)', 'Erro Calculado (mm)', 'Incerteza (mm)']
      }
    ]
  }
];

export const testQuotes: Quote[] = [
  {
    id: 'ORC-TEST-001',
    clienteId: 'CLI-001',
    clienteCnpj: '11.222.333/0001-44',
    clienteEndereco: 'Av. Inovação, 500 - Empreendimentos, Campinas - SP',
    clienteSolicitanteNome: 'Fernanda Lima',
    clienteSolicitanteEmail: 'fernanda@techcorp.com.br',
    clienteSolicitanteContato: '(19) 98888-7777',
    clienteEmailFinanceiro: 'nfe@techcorp.com.br',
    clienteRetencaoImpostoFonte: true,
    dataEmissao: '2026-03-24',
    validade: '2026-04-24',
    comissaoVendedor: true,
    tabelaPrecos: 'TAB-TEST-01',
    formaPagamento: 'PIX',
    items: [
      {
        item: 1,
        descricao: 'Multímetro Digital Mínimo 4 casas',
        quantidade: 2,
        tipoServico: 'Acreditado',
        local: 'Laboratório',
        valorUnitario: 250.00,
        desconto: 5,
        valorUnitarioFinal: 237.50,
        valorTotal: 475.00
      }
    ],
    status: QuoteStatus.APPROVED
  }
];

export const testServiceOrders: ServiceOrder[] = [
  {
    id: 'OS-TEST-001',
    orcamentoId: 'ORC-TEST-001',
    clienteId: 'CLI-001',
    dataEmissao: '2026-03-24',
    dataEntrada: '2026-03-24',
    dataSaida: '',
    responsavelEntrada: 'Recepção',
    responsavelSaida: '',
    tecnicoExecutante: 'Laboratório',
    statusServico: InstrumentStatus.IN_PROGRESS,
    statusCertificado: CertificateStatus.BEING_MADE
  }
];

export const testCalibrationRecords: CalibrationRecord[] = [
  {
    id: 'REC-TEST-001',
    serviceOrderId: 'OS-TEST-001',
    quoteItemIndex: 0,
    unitIndex: 0,
    instrumentName: 'Multímetro Digital',
    certificateNumber: 'CERT-TECH-001',
    calibrationDate: '2026-03-24',
    nextCalibrationDate: '2027-03-24',
    technicianName: 'Técnico Especialista',
    manufacturer: 'Minipa',
    model: 'ET-1000',
    serialNumber: 'SN-909090',
    identification: 'TAG-MM-01',
    periodicity: '12 Meses',
    calibrationLocation: 'Laboratório',
    temperature: 20.1,
    humidity: 50,
    envStandardInstrumentId: 'PAD-TEST-02',
    environmentalStandardId: 'PAD-TEST-02',
    procedureId: 'PROC-TEST-01',
    standardInstrumentIds: ['PAD-TEST-01'],
    certificateMaskId: 'MASK-TEST-01',
    observations: 'Instrumento em perfeitas condições.',
    groups: [
      {
        groupName: 'Tensão Contínua (VDC)',
        rows: [
          { 'vvc': '10.0',  'leitura': '10.02', 'erro': '0.02', 'incerteza': '0.05' },
          { 'vvc': '50.0',  'leitura': '50.15', 'erro': '0.15', 'incerteza': '0.06' },
          { 'vvc': '100.0', 'leitura': '100.41', 'erro': '0.41', 'incerteza': '0.08' },
          { 'vvc': '500.0', 'leitura': '501.80', 'erro': '1.80', 'incerteza': '0.25' },
          { 'vvc': '1000.0','leitura': '1004.50', 'erro': '4.50', 'incerteza': '0.50' }
        ],
        columnDefinitions: [
            { id: 'vvc', name: 'Valor Nominal (V)', type: 'VVC' as any, behavior: 'INPUT' as any },
            { id: 'leitura', name: 'Valor Indicado (V)', type: 'LEITURA' as any, behavior: 'INPUT' as any },
            { id: 'erro', name: 'Erro (V)', type: 'ERRO' as any, behavior: 'CALCULATED' as any, metrologyField: 'error' },
            { id: 'incerteza', name: 'Incerteza Expandida (V)', type: 'INCERTEZA' as any, behavior: 'CALCULATED' as any, metrologyField: 'U' }
        ]
      }
    ],
    calculatedPoints: {
      'Tensão Contínua (VDC)-0': { vvc: 10, error: 0.02, U: 0.05 } as any,
      'Tensão Contínua (VDC)-1': { vvc: 50, error: 0.15, U: 0.06 } as any,
      'Tensão Contínua (VDC)-2': { vvc: 100, error: 0.41, U: 0.08 } as any,
      'Tensão Contínua (VDC)-3': { vvc: 500, error: 1.80, U: 0.25 } as any,
      'Tensão Contínua (VDC)-4': { vvc: 1000, error: 4.50, U: 0.50 } as any
    },
    status: CertificateStatus.APPROVED,
    isPublished: true
  }
];

export const testFinancialControls: FinancialControl[] = [];

export const testEmployees: Employee[] = [
  {
    id: 'EMP-TEST-01',
    nome: 'Administrador do Sistema',
    cargo: 'Gerente Geral',
    email: 'admin@metroflow.com',
    telefone: '(11) 90000-0000',
    isSignatory: true,
    signatureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
    permissions: [Module.DASHBOARD, Module.COMMERCIAL, Module.TECHNICAL, Module.QUALITY, Module.FINANCE, Module.REGISTRY]
  }
];

export const testPaymentMethods: PaymentMethod[] = [
  { id: 'PM-T-01', description: 'PIX à Vista' },
  { id: 'PM-T-02', description: 'Boleto 30 Dias' }
];

export const testStandardCustodies: StandardCustody[] = [];
export const testFleetLogs: FleetLog[] = [];
export const testVehicles: Vehicle[] = [
  { id: 'VEIC-001', placa: 'ABC-1234', modelo: 'Fiat Uno (Branco)' },
  { id: 'VEIC-002', placa: 'XYZ-9876', modelo: 'VW Saveiro' }
];
