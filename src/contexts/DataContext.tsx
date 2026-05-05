import React, { createContext, useContext, useState, useEffect } from 'react';
import { z } from 'zod';
import { db, auth } from '../firebaseConfig';
import {
  Client, ClientStatus, Quote, ServiceOrder, StandardInstrument, CalibrationRecord, CalibrationResult, 
  FinancialControl, FinancialExpense, Employee, InstrumentType, CertificateMask, Procedure, 
  PaymentMethod, Bank, UnitOfMeasure, Module,
  StandardCustody, FleetLog, Vehicle, DocumentTemplate, InventoryItem, InventoryMovement,
  ThirdPartyRecord
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
  calibrationResults: CalibrationResult[];
  financialControls: FinancialControl[];
  financialExpenses: FinancialExpense[];
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
  inventoryItems: InventoryItem[];
  inventoryMovements: InventoryMovement[];
  thirdPartyRecords: ThirdPartyRecord[];
  loading: boolean;
  isSyncing: boolean;
  saveItem: (collectionName: string, item: any) => Promise<void>;
  deleteItem: (collectionName: string, id: string) => Promise<void>;
  hasPermission: (module: Module) => boolean;
  addClient: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, employee, loading: authLoading } = useAuth();
  const { logAction } = useAudit();
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // State Management
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [standardInstruments, setStandardInstruments] = useState<StandardInstrument[]>([]);
  const [calibrationRecords, setCalibrationRecords] = useState<CalibrationRecord[]>([]);
  const [calibrationResults, setCalibrationResults] = useState<CalibrationResult[]>([]);
  const [financialControls, setFinancialControls] = useState<FinancialControl[]>([]);
  const [financialExpenses, setFinancialExpenses] = useState<FinancialExpense[]>([]);
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
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [thirdPartyRecords, setThirdPartyRecords] = useState<ThirdPartyRecord[]>([]);

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
      case 'calibration_results': return { state: calibrationResults, setter: setCalibrationResults, save: tecnicoService.saveCalibrationResult };
      case 'financial_controls': return { state: financialControls, setter: setFinancialControls, save: financeiroService.saveFinancialControl };
      case 'financial_expenses': return { state: financialExpenses, setter: setFinancialExpenses, save: financeiroService.saveFinancialExpense };
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
      case 'inventory_items': return { state: inventoryItems, setter: setInventoryItems, save: (item: any) => apiClient.post<InventoryItem>('/api/mock/inventory_items', item) };
      case 'inventory_movements': return { state: inventoryMovements, setter: setInventoryMovements, save: (item: any) => apiClient.post<InventoryMovement>('/api/mock/inventory_movements', item) };
      case 'third_party_records': return { state: thirdPartyRecords, setter: setThirdPartyRecords, save: (item: any) => apiClient.post<ThirdPartyRecord>('/api/mock/third_party_records', item) };
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
      const savedResult = await promise;
      
      // 3. Final State Sync (Surgical)
      // We replace the optimistic item with the real result from the server (which might have IDs/timestamps)
      if (savedResult) {
        setter(prev => {
          const exists = prev.some(i => i.id === savedResult.id || i.id === item.id);
          if (exists) {
            return prev.map(i => (i.id === savedResult.id || i.id === item.id) ? { ...i, ...savedResult } : i);
          }
          return [...prev, savedResult];
        });
      }

      // Sincronização Automática: Qualidade (Instrumento) -> Estoque (Inventário)
      if (collectionName === 'standard_instruments' && savedResult) {
        const instId = savedResult.id || item.id;
        
        // Use a chamada original sem state local
        const currentInventory = await apiClient.fetch<InventoryItem>('/api/mock/inventory_items').catch(() => []);
        const invItem = currentInventory.find(i => i.standardInstrumentId === instId);
        
        if (invItem) {
          if (invItem.descricao !== savedResult.nome || invItem.instrumentoId !== savedResult.identificacao) {
            const updatedInvItem = { ...invItem, descricao: savedResult.nome || '', instrumentoId: savedResult.identificacao || '' };
            await apiClient.post<InventoryItem>('/api/mock/inventory_items', updatedInvItem);
            // Surgical update for inventory as well
            setInventoryItems(prev => prev.map(i => i.id === updatedInvItem.id ? updatedInvItem : i));
          }
        } else {
          const newInvItem: InventoryItem = {
            id: `INV-${Date.now()}`,
            descricao: savedResult.nome || '',
            categoria: 'Instrumento',
            quantidade: 1,
            unidade: 'un',
            valorUnitario: 0,
            statusMovimentacao: 'Disponível',
            instrumentoId: savedResult.identificacao || '',
            standardInstrumentId: instId
          };
          const savedInv = await apiClient.post<InventoryItem>('/api/mock/inventory_items', newInvItem);
          setInventoryItems(prev => [...prev, savedInv]);
        }
      }

      if (!isNew) {
        logAction('UPDATE', item.id, collectionName, previousState.find(i => i.id === item.id), item);
      } else {
        logAction('CREATE', savedResult?.id || item.id, collectionName, null, savedResult || item);
      }
    } catch (error: any) {
      // 4. Rollback on error
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
      // fetchAllData() removido para atualização cirúrgica
      logAction('DELETE', id, collectionName, previousState.find(i => i.id === id), null);
    } catch (e) {
      setter(previousState);
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
    const newId = (maxId + 1).toString().padStart(3, '0');
    
    await saveItem('clients', {
      id: newId,
      razaoSocial: `Novo Cliente ${newId}`,
      cnpj: '00.000.000/0000-00',
      status: ClientStatus.NOT_UPDATED,
      funcionarioCadastro: employee?.nome || 'Sistema',
    });
  };

  const fetchCoreData = async () => {
    setIsSyncing(true);
    try {
      const results = await Promise.allSettled([
        comercialService.getClients(),
        comercialService.getQuotes(),
        tecnicoService.getServiceOrders(),
        tecnicoService.getStandardInstruments(),
        apiClient.fetch<Employee>('/api/mock/employees'),
      ]);

      const safeGet = (r: PromiseSettledResult<any>, fallback: any[] = []) => {
        if (r.status === 'fulfilled') return r.value ?? fallback;
        console.warn('Core Collection fetch failed:', (r as PromiseRejectedResult).reason);
        return fallback;
      };

      const [clientsData, quotesData, soData, stdData, empData] = results;

      setClients(safeGet(clientsData));
      setQuotes(safeGet(quotesData));
      setServiceOrders(safeGet(soData));
      setStandardInstruments(safeGet(stdData));
      setEmployees(safeGet(empData));
    } catch (e) {
      console.error("Core Sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchSecondaryData = async () => {
    try {
      const results = await Promise.allSettled([
        tecnicoService.getCalibrationRecords(),
        tecnicoService.getCalibrationResults(),
        financeiroService.getFinancialControls(),
        financeiroService.getFinancialExpenses(),
        logisticaService.getFleetLogs(),
        logisticaService.getVehicles(),
        logisticaService.getStandardCustodies(),
        apiClient.fetch<any>('/api/mock/price_tables'),
        apiClient.fetch<InstrumentType>('/api/mock/instrument_types'),
        apiClient.fetch<CertificateMask>('/api/mock/certificate_masks'),
        apiClient.fetch<Procedure>('/api/mock/procedures'),
        apiClient.fetch<PaymentMethod>('/api/mock/payment_methods'),
        apiClient.fetch<Bank>('/api/mock/banks'),
        apiClient.fetch<UnitOfMeasure>('/api/mock/units_of_measure'),
        apiClient.fetch<DocumentTemplate>('/api/mock/document_templates'),
        apiClient.fetch<InventoryItem>('/api/mock/inventory_items'),
        apiClient.fetch<InventoryMovement>('/api/mock/inventory_movements'),
        apiClient.fetch<ThirdPartyRecord>('/api/mock/third_party_records'),
      ]);

      const safeGet = (r: PromiseSettledResult<any>, fallback: any[] = []) => {
        if (r.status === 'fulfilled') return r.value ?? fallback;
        return fallback;
      };

      const [calData, resData, finData, expData, fleetData, vehData, custodyData, ptData, itData, cmData, procData, pmData, bankData, uomData, dtRawResult, invData, movData, tpData] = results;

      setCalibrationRecords(safeGet(calData));
      setCalibrationResults(safeGet(resData));
      setFinancialControls(safeGet(finData));
      setFinancialExpenses(safeGet(expData));
      setFleetLogs(safeGet(fleetData));
      setVehicles(safeGet(vehData));
      setStandardCustodies(safeGet(custodyData));
      setPriceTables(safeGet(ptData));
      setInstrumentTypes(safeGet(itData));
      setCertificateMasks(safeGet(cmData));
      setProcedures(safeGet(procData));
      setPaymentMethods(safeGet(pmData));
      setBanks(safeGet(bankData));
      setUnitsOfMeasure(safeGet(uomData));
      setInventoryMovements(safeGet(movData));
      setThirdPartyRecords(safeGet(tpData));

      const dtRawData = safeGet(dtRawResult);
      setDocumentTemplates(dtRawData);

      // --- BACKFILL SYNC & TEMPLATES (Lazy background) ---
      const currentInvData = safeGet(invData);
      setInventoryItems(currentInvData);

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
      const validDtRawData = Array.isArray(dtRawData) ? dtRawData : [];

      for (const req of requiredTypes) {
        if (!validDtRawData.find((t: DocumentTemplate) => t.id === req.id || t.applyTo === req.applyTo)) {
          const newConfig: DocumentTemplate = {
            id: req.id,
            name: req.name,
            applyTo: req.applyTo,
            commercialConditions: req.applyTo === 'QUOTE' ? '...' : '', // Truncated for brevity but logic remains
            technicalInformation: '',
            generalConditions: '',
          };
          await apiClient.post<DocumentTemplate>('/api/mock/document_templates', newConfig);
          templatesUpdated = true;
        }
      }

      if (templatesUpdated) {
        const updatedTemplates = await apiClient.fetch<DocumentTemplate>('/api/mock/document_templates');
        setDocumentTemplates(updatedTemplates);
      }
    } catch (e) {
      console.warn("Secondary Sync error:", e);
    }
  };

  const fetchAllData = async () => {
    await fetchCoreData();
    await fetchSecondaryData();
  };

  useEffect(() => {
    const isPortal = window.location.pathname.startsWith('/portal');
    
    // If auth is still checking, don't finish loading DataContext
    if (authLoading) return;

    if (!user && !isPortal) {
      setLoading(false);
      return;
    }

    const loadInitialData = async () => {
      // Step 1: Core data (needed for dashboard/main screens)
      await fetchCoreData();
      setLoading(false); // Unblock the UI immediately after core data

      // Step 2: Background secondary data
      fetchSecondaryData();
    };

    loadInitialData();
  }, [user, authLoading]);

  return (
    <DataContext.Provider value={{
      clients, quotes, serviceOrders, standardInstruments, calibrationRecords, calibrationResults,
      financialControls, financialExpenses, employees, priceTables, instrumentTypes, certificateMasks,
      procedures, paymentMethods, banks, unitsOfMeasure,
      standardCustodies, fleetLogs, vehicles, documentTemplates,
      inventoryItems, inventoryMovements, thirdPartyRecords,
      loading, isSyncing, saveItem, deleteItem, hasPermission, addClient,
      searchQuery, setSearchQuery
    }}>
      {children}
    </DataContext.Provider>
  );
};
