import { InstrumentStatus, StandardCustody, FleetLog } from '../types';

/**
 * Determina o status de uma Ordem de Serviço com base nas etapas concluídas.
 */
export const determineOSStatus = (flags: {
  calibracaoConcluida: boolean;
  certificadosEnviados: boolean;
  saidaConfirmada: boolean;
  dataSaida: string;
  entradaConfirmada: boolean;
  dataEntrada: string;
}): InstrumentStatus => {
  if (flags.calibracaoConcluida && flags.certificadosEnviados && flags.saidaConfirmada && flags.dataSaida) {
    return InstrumentStatus.COMPLETED;
  } 
  
  if (flags.saidaConfirmada && flags.dataSaida) {
    return InstrumentStatus.DELIVERED;
  } 
  
  if (flags.calibracaoConcluida) {
    return InstrumentStatus.CALIBRATED;
  } 
  
  if (flags.entradaConfirmada && flags.dataEntrada) {
    return InstrumentStatus.IN_PROGRESS;
  }

  return InstrumentStatus.PENDING;
};

/**
 * Calcula a diferença de quilometragem percorrida.
 */
export const calculateKmDiff = (kmInicial: number, kmFinal: number): string => {
  const final = kmFinal || 0;
  const inicial = kmInicial || 0;
  
  if (final > inicial) {
    return (final - inicial).toFixed(1);
  }
  
  return 'Em trâns.';
};

/**
 * Gera o próximo ID sequencial para uma nova Cautela.
 */
export const generateNextCustodyId = (custodies: StandardCustody[]): string => {
  let maxId = 26000;
  custodies.forEach(c => {
    const match = c.id.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxId) maxId = num;
    }
  });
  return `${maxId + 1}`;
};

/**
 * Gera o próximo ID sequencial para um novo registro de frota.
 */
export const generateNextFleetId = (logs: FleetLog[]): string => {
  let maxId = 26000;
  logs.forEach(f => {
    const match = f.id?.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      if (num > maxId) maxId = num;
    }
  });
  return `${maxId + 1}`;
};
