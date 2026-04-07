import { Client, Quote, StandardInstrument, ServiceOrder, CalibrationRecord, FinancialControl, Employee, PriceTable, Procedure, CertificateMask, PaymentMethod, StandardCustody, FleetLog, Vehicle } from './types';

// ==========================================
// MODO DE TESTE ATIVADO
// ==========================================
// Os dados abaixo estão sendo importados da pasta 'dados_testes' para facilitar sua limpeza posterior.
// Quando você excluir a pasta 'dados_testes', basta comentar estas importações
// e descomentar as exportações de arrays vazios mais abaixo na seção DE PRODUÇÃO.

import { 
  testClients, 
  testQuotes, 
  testStandardInstruments, 
  testServiceOrders, 
  testCalibrationRecords, 
  testFinancialControls, 
  testEmployees, 
  testPriceTables, 
  testProcedures, 
  testCertificateMasks, 
  testPaymentMethods,
  testStandardCustodies,
  testFleetLogs,
  testVehicles
} from './dados_testes/novosDados';

export const mockClients: Client[] = testClients;
export const mockStandardInstruments: StandardInstrument[] = testStandardInstruments;
export const mockQuotes: Quote[] = testQuotes;
export const mockServiceOrders: ServiceOrder[] = testServiceOrders;
export const mockCalibrationRecords: CalibrationRecord[] = testCalibrationRecords;
export const mockFinancialControls: FinancialControl[] = testFinancialControls;
export const mockEmployees: Employee[] = testEmployees;
export const mockPriceTables: PriceTable[] = testPriceTables;
export const mockProcedures: Procedure[] = testProcedures;
export const mockCertificateMasks: CertificateMask[] = testCertificateMasks;
export const mockPaymentMethods: PaymentMethod[] = testPaymentMethods;
export const mockStandardCustodies: StandardCustody[] = testStandardCustodies;
export const mockFleetLogs: FleetLog[] = testFleetLogs;
export const mockVehicles: Vehicle[] = testVehicles;

/*
// ==========================================
// ARRAYS VAZIOS (PARA PRODUÇÃO / PÓS-TESTE)
// ==========================================
// Quando finalizar os testes e excluir a pasta 'dados_testes', apague a importação acima e descomente o bloco abaixo:

export const mockClients: Client[] = [];
export const mockStandardInstruments: StandardInstrument[] = [];
export const mockQuotes: Quote[] = [];
export const mockServiceOrders: ServiceOrder[] = [];
export const mockCalibrationRecords: CalibrationRecord[] = [];
export const mockFinancialControls: FinancialControl[] = [];
export const mockEmployees: Employee[] = [];
export const mockPriceTables: PriceTable[] = [];
export const mockProcedures: Procedure[] = [];
export const mockCertificateMasks: CertificateMask[] = [];
export const mockPaymentMethods: PaymentMethod[] = [];
export const mockStandardCustodies: StandardCustody[] = [];
export const mockFleetLogs: FleetLog[] = [];
export const mockVehicles: Vehicle[] = [];
*/
