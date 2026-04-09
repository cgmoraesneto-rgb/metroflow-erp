import React, { createContext, useContext, useState, useEffect } from 'react';
import { z } from 'zod';
import { db, auth } from '../firebaseConfig';
import {
  Client, Quote, ServiceOrder, StandardInstrument, CalibrationRecord,
  FinancialControl, Employee, InstrumentType, CertificateMask, Procedure,
  PaymentMethod, Bank, UnitOfMeasure, ClientStatus, CertificateStatus, Module,
  StandardCustody, FleetLog, Vehicle, DocumentTemplate
} from '../types';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

// Import Domain Services
import { comercialService } from '../services/comercialService';
import { tecnicoService } from '../services/tecnicoService';
import { financeiroService } from '../services/financeiroService';
import { logisticaService } from '../services/logisticaService';
import { apiClient } from '../services/apiClient';
import { useAudit } from './AuditContext';
import { urlToBase64 } from '../utils/imageUtils';

interface DataContextType {
  clients: Client[];
  quotes: Quote[];
  serviceOrders: ServiceOrder[];
  standardInstruments: StandardInstrument[];
  calibrationRecords: CalibrationRecord[];
  financialControls: FinancialControl[];
  employees: Employee[];
  priceTables: any[];
  instrumentTypes: InstrumentType[];
  certificateMasks: CertificateMask[];
  procedures: Procedure[];
  paymentMethods: PaymentMethod[];
  banks: Bank[];
  unitsOfMeasure: UnitOfMeasure[];
  standardCustodies: StandardCustody[];
  fleetLogs: FleetLog[];
  vehicles: Vehicle[];
  documentTemplates: DocumentTemplate[];
  loading: boolean;
  isSyncing: boolean;
  saveItem: (collectionName: string, item: any) => Promise<void>;
  deleteItem: (collectionName: string, id: string) => Promise<void>;
  hasPermission: (module: Module) => boolean;
  addClient: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, employee } = useAuth();
  const { logAction } = useAudit();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // State Management
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [standardInstruments, setStandardInstruments] = useState<StandardInstrument[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>([]);
  const [financialControls, setFinancialControls] = useState<FinancialControl[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [priceTables, setPriceTables] = useState<any[]>([]);
  const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([]);
  const [certificateMasks, setCertificateMasks] = useState<CertificateMask[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [unitsOfMeasure, setUnitsOfMeasure] = useState<UnitOfMeasure[]>([]);
  const [standardCustodies, setStandardCustodies] = useState<StandardCustody[]>([]);
  const [fleetLogs, setFleetLogs] = useState<FleetLog[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);

  const hasPermission = (module: Module) => {
    // Admins always have full access to all modules
    if (employee?.role === 'Administrador') return true;
    // Fallback: legacy email bypass
    if (user?.email?.toLowerCase() === 'c.g.moraesneto@gmail.com') return true;
    return employee?.permissions?.includes(module) || false;
  };

  /**
   * Helper to map collection name to its setter and service method
   * Part of the "Clean Infrastructure" mapping
   */
  const getCollectionConfig = (name: string) => {
    switch (name) {
      case 'clients': return { state: clients, setter: setClients, save: comercialService.saveClient };
      case 'quotes': return { state: quotes, setter: setQuotes, save: comercialService.saveQuote };
      case 'service_orders': return { state: serviceOrders, setter: setServiceOrders, save: tecnicoService.saveServiceOrder };
      case 'standard_instruments': return { state: standardInstruments, setter: setStandardInstruments, save: tecnicoService.saveStandardInstrument };
      case 'calibration_records': return { state: calibrationRecords, setter: setCalibrationRecords, save: tecnicoService.saveCalibrationRecord };
      case 'financial_controls': return { state: financialControls, setter: setFinancialControls, save: financeiroService.saveFinancialControl };
      case 'fleet_logs': return { state: fleetLogs, setter: setFleetLogs, save: logisticaService.saveFleetLog };
      case 'standard_custodies': return { state: standardCustodies, setter: setStandardCustodies, save: logisticaService.saveStandardCustody };
      case 'procedures': return { state: procedures, setter: setProcedures, save: tecnicoService.saveProcedure };
      case 'document_templates': return { state: documentTemplates, setter: setDocumentTemplates, save: (item: any) => apiClient.post<DocumentTemplate>('/api/mock/document_templates', item) };
      case 'employees': return { state: employees, setter: setEmployees, save: (item: any) => apiClient.post<Employee>('/api/mock/employees', item) };
      case 'vehicles': return { state: vehicles, setter: setVehicles, save: (item: any) => apiClient.post<Vehicle>('/api/mock/vehicles', item) };
      case 'price_tables': return { state: priceTables, setter: setPriceTables, save: (item: any) => apiClient.post<any>('/api/mock/price_tables', item) };
      case 'instrument_types': return { state: instrumentTypes, setter: setInstrumentTypes, save: (item: any) => apiClient.post<InstrumentType>('/api/mock/instrument_types', item) };
      case 'certificate_masks': return { state: certificateMasks, setter: setCertificateMasks, save: (item: any) => apiClient.post<CertificateMask>('/api/mock/certificate_masks', item) };
      case 'payment_methods': return { state: paymentMethods, setter: setPaymentMethods, save: (item: any) => apiClient.post<PaymentMethod>('/api/mock/payment_methods', item) };
      case 'banks': return { state: banks, setter: setBanks, save: (item: any) => apiClient.post<Bank>('/api/mock/banks', item) };
      case 'units_of_measure': return { state: unitsOfMeasure, setter: setUnitsOfMeasure, save: (item: any) => apiClient.post<UnitOfMeasure>('/api/mock/units_of_measure', item) };
      default: return null;
    }
  };

  const saveItem = async (collectionName: string, item: any) => {
    const config = getCollectionConfig(collectionName);
    if (!config) {
      console.warn(`No service found for ${collectionName}, using legacy fetch`);
      return;
    }

    // --- OPTIMISTIC UI ---
    const previousState = [...config.state];
    const exists = config.state.some(i => i.id === item.id);
    const isNew = !item.id || !exists;
    
    // 1. Update UI immediately
    const setter = config.setter as React.Dispatch<React.SetStateAction<any[]>>;
    if (isNew) {
      // If it has an ID but doesn't exist, we use the provided ID. 
      // If no ID, we generate a temp one (though most models here pre-generate IDs).
      const newItem = { ...item };
      if (!newItem.id) newItem.id = 'temp-' + Date.now();
      setter(prev => [...prev, newItem]);
    } else {
      setter(prev => prev.map(i => i.id === item.id ? { ...i, ...item } : i));
    }

    // 2. Perform background save
    let itemToSave = { ...item };

    // --- FIRESTORE SIZE PROTECTION ---
    // If we're saving a template and it has legacy base64 images that are too large, 
    // we strip them to prevent the entire save operation from failing.
    if (collectionName === 'document_templates') {
      const LIMIT = 900000; // Safe margin below 1MB
      if ((itemToSave.letterheadBase64?.length || 0) > LIMIT) {
        console.warn("Stripping oversized letterheadBase64 to prevent Firestore error");
        itemToSave.letterheadBase64 = ''; 
      }
      if ((itemToSave.footerBase64?.length || 0) > LIMIT) {
        console.warn("Stripping oversized footerBase64 to prevent Firestore error");
        itemToSave.footerBase64 = '';
      }
    } else if (collectionName === 'employees') {
      const LIMIT = 900000;
      if ((itemToSave.signatureBase64?.length || 0) > LIMIT) {
        console.warn("Stripping oversized signature to prevent Firestore error");
        itemToSave.signatureBase64 = '';
      }
    }

    const promise = config.save(itemToSave) as Promise<any>;
    
    toast.promise(promise, {
      loading: `Salvando ${collectionName}...`,
      success: 'Salvo com sucesso!',
      error: 'Erro ao salvar dados.'
    });

    try {
      await promise;
      await fetchAllData(); // Final sync to get real IDs/timestamps
      if (!isNew) {
        logAction('UPDATE', item.id, collectionName, previousState.find(i => i.id === item.id), item);
      } else {
        logAction('CREATE', item.id, collectionName, null, item);
      }
    } catch (error: any) {
      // 3. Rollback on error
      setter(previousState);
      const errorMessage = error instanceof z.ZodError 
        ? error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        : error.message || 'Erro desconhecido';
      toast.error(`Falha ao salvar em ${collectionName}: ${errorMessage}. Operação revertida.`);
    }
  };

  const deleteItem = async (collectionName: string, id: string) => {
    const config = getCollectionConfig(collectionName);
    if (!config) return;

    // --- OPTIMISTIC UI ---
    const previousState = [...config.state] as any[];
    const setter = config.setter as React.Dispatch<React.SetStateAction<any[]>>;
    setter(prev => prev.filter(i => i.id !== id));

    let promise: Promise<any>;
    if (collectionName === 'clients') promise = comercialService.deleteClient(id);
    else if (collectionName === 'quotes') promise = comercialService.deleteQuote(id);
    else promise = apiClient.delete(`/api/mock/${collectionName}/${id}`);

    toast.promise(promise, {
      loading: 'Excluindo...',
      success: 'Excluído!',
      error: 'Erro ao excluir.'
    });

    try {
      await promise;
      fetchAllData();
      logAction('DELETE', id, collectionName, previousState.find(i => i.id === id), null);
    } catch (e) {
      config.setter(previousState);
    }
  };

  const addClient = async () => {
    // Business logic now encapsulated in service
    const currentClients = await comercialService.getClients();
    let maxId = 0;
    currentClients.forEach(c => {
      if (/^\d+$/.test(c.id)) {
        const nid = parseInt(c.id, 10);
        if (nid > maxId) maxId = nid;
      }
    });
    const newId = (maxId + 1).toString().padStart(4, '0');
    
    await saveItem('clients', {
      id: newId,
      razaoSocial: `Novo Cliente ${newId}`,
      cnpj: '00.000.000/0000-00',
      status: ClientStatus.NOT_UPDATED,
      funcionarioCadastro: employee?.nome || 'Sistema',
    });
  };

  const fetchAllData = async () => {
    setIsSyncing(true);
    try {
      const [
        clientsData, quotesData, soData, stdData, calData, finData, 
        empData, fleetData, vehData, custodyData
      ] = await Promise.all([
        comercialService.getClients(),
        comercialService.getQuotes(),
        tecnicoService.getServiceOrders(),
        tecnicoService.getStandardInstruments(),
        tecnicoService.getCalibrationRecords(),
        financeiroService.getFinancialControls(),
        apiClient.fetch<Employee>('/api/mock/employees'),
        logisticaService.getFleetLogs(),
        logisticaService.getVehicles(),
        logisticaService.getStandardCustodies()
      ]);

      setClients(clientsData);
      setQuotes(quotesData);
      setServiceOrders(soData);
      setStandardInstruments(stdData);
      setCalibrationRecords(calData);
      setFinancialControls(finData);
      setEmployees(empData);
      setFleetLogs(fleetData);
      setVehicles(vehData);
      setStandardCustodies(custodyData);

      // Fetch secondary collections via apiClient (Firestore)
      const [ptData, itData, cmData, procData, pmData, bankData, uomData, dtRawData] = await Promise.all([
        apiClient.fetch<any>('/api/mock/price_tables'),
        apiClient.fetch<InstrumentType>('/api/mock/instrument_types'),
        apiClient.fetch<CertificateMask>('/api/mock/certificate_masks'),
        apiClient.fetch<Procedure>('/api/mock/procedures'),
        apiClient.fetch<PaymentMethod>('/api/mock/payment_methods'),
        apiClient.fetch<Bank>('/api/mock/banks'),
        apiClient.fetch<UnitOfMeasure>('/api/mock/units_of_measure'),
        apiClient.fetch<DocumentTemplate>('/api/mock/document_templates'),
      ]);

      setPriceTables(ptData);
      setInstrumentTypes(itData);
      setCertificateMasks(cmData);
      setProcedures(procData);
      setPaymentMethods(pmData);
      setBanks(bankData);
      setUnitsOfMeasure(uomData);
      setDocumentTemplates(dtRawData);

      // Initialize default document template configurations if missing
      const requiredTypes = [
        { id: 'QUOTE', name: 'Orçamento (Proposta Comercial)', applyTo: 'QUOTE' },
        { id: 'OS', name: 'Ordem de Serviço', applyTo: 'OS' },
        { id: 'LOGISTICS_PROTOCOL', name: 'Protocolo de Logística (Retirada/Entrega)', applyTo: 'LOGISTICS_PROTOCOL' },
        { id: 'CALIBRATION_CERTIFICATE', name: 'Certificado de Calibração', applyTo: 'CALIBRATION_CERTIFICATE' },
        { id: 'CAUTELA', name: 'Termo de Cautela', applyTo: 'CAUTELA' },
        { id: 'INSTRUMENT_SHEET', name: 'Ficha de Equipamento/Instrumento', applyTo: 'INSTRUMENT_SHEET' },
      ];

      let templatesUpdated = false;
      for (const req of requiredTypes) {
        if (!dtRawData.find((t: DocumentTemplate) => t.id === req.id || t.applyTo === req.applyTo)) {
          const newConfig: DocumentTemplate = {
            id: req.id,
            name: req.name,
            applyTo: req.applyTo,
            commercialConditions: req.applyTo === 'QUOTE'
              ? '2.1 [Forma de pagamento]\n2.2 Este orçamento tem validade de 30 dias corridos após a data de emissão.\n2.3 O serviço inicia-se a partir da aprovação formal, via pedido de compras ou proposta assinada.\n2.4 Prazo para entrega dos equipamentos é 07 dias úteis. No caso de grande quantidade, verificar data de entrega com setor comercial.\n2.5 Os certificados serão entregues no prazo máximo de 10 dias úteis.\n2.6 Será cobrado taxa de deslocamento, retirada e devolução. No caso das despesas de viagem, as mesmas deverão ser pagas nos dias que antecederem a ida do(s) técnico(s).'
              : '',
            technicalInformation: '',
            generalConditions: '',
          };
          await apiClient.post<DocumentTemplate>('/api/mock/document_templates', newConfig);
          templatesUpdated = true;
        }
      }

      // Re-fetch templates once if any were added
      if (templatesUpdated) {
        const updatedTemplates = await apiClient.fetch<DocumentTemplate>('/api/mock/document_templates');
        setDocumentTemplates(updatedTemplates);
      }
    } catch (e) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const isPortal = window.location.pathname.startsWith('/portal');
    
    if (!user && !isPortal) {
      setLoading(false);
      return;
    }

    const loadInitialData = async () => {
      await fetchAllData();
      setLoading(false);
    };

    loadInitialData();
  }, [user]);

  return (
    <DataContext.Provider value={{
      clients, quotes, serviceOrders, standardInstruments, calibrationRecords,
      financialControls, employees, priceTables, instrumentTypes, certificateMasks,
      procedures, paymentMethods, banks, unitsOfMeasure,
      standardCustodies, fleetLogs, vehicles, documentTemplates,
      loading, isSyncing, saveItem, deleteItem, hasPermission, addClient
    }}>
      {children}
    </DataContext.Provider>
  );
};
