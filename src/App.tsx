import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useData } from './contexts/DataContext';
import Login from './components/Login';
import Layout from './components/Layout';
import FirstLoginPasswordChange from './components/FirstLoginPasswordChange';
import { toast } from 'sonner';
import RBACGuard from './components/RBACGuard';
import ErrorBoundary from './components/ErrorBoundary';
import { Module, ClientStatus, CertificateStatus, UserRole, ServiceOrder } from './types';
import { lazy, Suspense } from 'react';

// ─── Lazy-loaded Route Modules ────────────────────────────────────────────────
// Each module is split into its own JS chunk and only downloaded when the user
// navigates to that route, dramatically reducing the initial bundle size.
const DashboardModule = lazy(() => import('./components/DashboardModule'));
const QuotesSection = lazy(() => import('./components/QuotesSection'));
const QualityModule = lazy(() => import('./components/QualityModule'));
const TechnicalModule = lazy(() => import('./components/TechnicalModule'));
const FinanceModule = lazy(() => import('./components/FinanceModule'));
const GeneralRegistersModule = lazy(() => import('./components/GeneralRegistersModule'));
const LogisticsModule = lazy(() => import('./components/LogisticsModule'));
const ClientPortal = lazy(() => import('./components/ClientPortal'));
const ClientsSection = lazy(() => import('./components/ClientsSection'));
const PriceTableManagementModule = lazy(() => import('./components/PriceTableManagementModule'));

// Sub-components
import { useState } from 'react';

// ─── Suspense Fallback ─────────────────────────────────────────────────────────
const ModuleLoader = ({ label }: { label?: string }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
      <div className="absolute inset-0 rounded-full border-4 border-t-indigo-600 animate-spin" />
    </div>
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
      {label || 'Carregando módulo...'}
    </p>
  </div>
);



export default function App() {
  const { user, employee, loading: authLoading, logout, mustChangePassword, changePassword } = useAuth();
  const { loading: dataLoading } = useData();

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando dados do sistema...</p>
        </div>
      </div>
    );
  }

  const isPortal = window.location.pathname.startsWith('/portal');

  if (!user && !isPortal) {
    return <Login />;
  }

  // Intercept: force password change on first login
  if (mustChangePassword && employee) {
    return (
      <FirstLoginPasswordChange
        employeeName={employee.nome}
        onConfirm={changePassword}
      />
    );
  }

  // Check if user has an associated employee profile
  if (user && !employee && user.email?.toLowerCase() !== 'c.g.moraesneto@gmail.com' && !isPortal) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100 text-center">
          <div className="bg-amber-100 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <span className="text-amber-600 text-3xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-gray-500 mb-8">
            Seu usuário ({user.email}) não possui um perfil de funcionário vinculado.
            Entre em contato com o administrador para solicitar acesso.
          </p>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/portal/*" element={
        <ErrorBoundary moduleName="Portal do Cliente">
          <Suspense fallback={<ModuleLoader label="Carregando Portal..." />}>
            <ClientPortal />
          </Suspense>
        </ErrorBoundary>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route path="/dashboard" element={
        <Layout>
          <ErrorBoundary moduleName="Dashboard">
            <Suspense fallback={<ModuleLoader label="Carregando Dashboard..." />}>
              <DashboardWrapper />
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />

      <Route path="/comercial/*" element={
        <Layout>
          <ErrorBoundary moduleName="Módulo Comercial">
            <Suspense fallback={<ModuleLoader label="Carregando Módulo Comercial..." />}>
              <ComercialWrapper />
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />

      <Route path="/logistica" element={
        <Layout>
          <ErrorBoundary moduleName="Módulo Logística">
            <Suspense fallback={<ModuleLoader label="Carregando Logística..." />}>
              <LogisticsWrapper />
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />

      <Route path="/qualidade" element={
        <Layout>
          <RBACGuard allowedModules={[Module.QUALITY]}>
            <ErrorBoundary moduleName="Módulo Qualidade">
              <Suspense fallback={<ModuleLoader label="Carregando Qualidade..." />}>
                <QualityWrapper />
              </Suspense>
            </ErrorBoundary>
          </RBACGuard>
        </Layout>
      } />

      <Route path="/tecnico" element={
        <Layout>
          <RBACGuard allowedModules={[Module.TECHNICAL]}>
            <ErrorBoundary moduleName="Módulo Técnico">
              <Suspense fallback={<ModuleLoader label="Carregando Módulo Técnico..." />}>
                <TechnicalWrapper />
              </Suspense>
            </ErrorBoundary>
          </RBACGuard>
        </Layout>
      } />

      <Route path="/financeiro" element={
        <Layout>
          <ErrorBoundary moduleName="Módulo Financeiro">
            <Suspense fallback={<ModuleLoader label="Carregando Financeiro..." />}>
              <FinanceWrapper />
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />

      <Route path="/cadastros" element={
        <Layout>
          <ErrorBoundary moduleName="Cadastros Gerais">
            <Suspense fallback={<ModuleLoader label="Carregando Cadastros..." />}>
              <GeneralRegistersWrapper />
            </Suspense>
          </ErrorBoundary>
        </Layout>
      } />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function DashboardWrapper() {
  const { clients, quotes, serviceOrders, financialControls, calibrationRecords, standardInstruments, saveItem, deleteItem } = useData();
  return (
    <DashboardModule
      clients={clients}
      quotes={quotes}
      serviceOrders={serviceOrders}
      financialControls={financialControls}
      calibrationRecords={calibrationRecords}
      standardInstruments={standardInstruments}
      saveItem={saveItem}
      deleteItem={deleteItem}
    />
  );
}

function ComercialWrapper() {
  const { clients, quotes, serviceOrders, priceTables, paymentMethods, documentTemplates, saveItem, deleteItem, addClient } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('tab') || 'clients';

  const setSubTab = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Módulo Comercial</h2>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
          {(['clients', 'price_tables', 'quotes'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setSubTab(tab)}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${subTab === tab ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              {tab === 'clients' ? 'Clientes' : tab === 'price_tables' ? 'Tabelas' : 'Orçamentos'}
            </button>
          ))}
        </div>
      </div>

      {subTab === 'clients' && (
        <ClientsSection
          clients={clients}
          quotes={quotes}
          serviceOrders={serviceOrders}
          documentTemplates={documentTemplates}
          onAddClient={addClient}
          onSaveClient={(c: any) => saveItem('clients', c)}
          onDeleteClient={(id: string) => deleteItem('clients', id)}
          onUpdateStatus={(id: string) => saveItem('clients', { id, status: ClientStatus.UPDATED })}
        />
      )}

      {subTab === 'price_tables' && (
        <PriceTableManagementModule
          priceTables={priceTables}
          onSavePriceTable={(p: any) => saveItem('price_tables', p)}
          onDeletePriceTable={(id: string) => deleteItem('price_tables', id)}
        />
      )}

      {subTab === 'quotes' && (
        <QuotesSection
          clients={clients}
          priceTables={priceTables}
          quotes={quotes}
          paymentMethods={paymentMethods}
          onSaveQuote={(q: any) => saveItem('quotes', q)}
          onDeleteQuote={(id: string) => deleteItem('quotes', id)}
          onApproveQuote={async (approvedQuote, newSO) => {
            await saveItem('quotes', approvedQuote);
            await saveItem('service_orders', newSO);
          }}
        />
      )}
    </div>
  );
}

function LogisticsWrapper() {
  const { serviceOrders, clients, quotes, documentTemplates, saveItem } = useData();
  return (
    <LogisticsModule
      serviceOrders={serviceOrders}
      clients={clients}
      quotes={quotes}
      documentTemplates={documentTemplates}
      onSaveServiceOrder={(so: ServiceOrder) => saveItem('service_orders', so)}
    />
  );
}

function QualityWrapper() {
  const { employee } = useAuth();
  const { calibrationRecords, serviceOrders, clients, certificateMasks, standardInstruments, procedures, documentTemplates, employees, saveItem, deleteItem } = useData();
  return (
    <QualityModule
      calibrationRecords={calibrationRecords}
      serviceOrders={serviceOrders}
      clients={clients}
      certificateMasks={certificateMasks}
      standardInstruments={standardInstruments}
      procedures={procedures}
      documentTemplates={documentTemplates}
      employees={employees}
      onUpdateCertificateStatus={async (recordId, status, justification, signatarioId) => {
        const record = calibrationRecords.find(r => r.id === recordId);
        if (record) {
          let updatedRecord: any = { ...record, status };

          // [PHASE 4.6] 3-Step Approval Workflow (ISO/IEC 17025)
          const userId = employee?.id || 'unknown';
          const officialSignatario = employees.find(e => e.isSignatory);
          const finalSignatario = signatarioId || (status === CertificateStatus.READY_FOR_SENDING ? officialSignatario?.id : undefined);

          if (status === CertificateStatus.READY_FOR_SENDING && !finalSignatario) {
            toast.error('Nenhum signatário oficial cadastrado. Defina um signatário no cadastro de funcionários.');
            return;
          }

          if (status === CertificateStatus.READY_FOR_SENDING && employee?.id !== finalSignatario) {
            toast.error('Aprovação L2 somente pelo signatário oficial logado.');
            return;
          }

          if (status === CertificateStatus.IN_ANALYSIS) {
            // STEP 1: Technician Submission
            updatedRecord.signedBy = [userId];
          }
          else if (status === CertificateStatus.APPROVED) {
            // STEP 2: Quality Reviewer (L1) Approval
            if (record.signedBy?.includes(userId)) {
              toast.error("O Revisor não pode ser o mesmo Técnico que realizou a calibração.");
              return;
            }
            updatedRecord.signedBy = [...(record.signedBy || []), userId];
            updatedRecord.l1ApproverId = userId;
          }
          else if (status === CertificateStatus.READY_FOR_SENDING) {
            // STEP 3: Authorized Signatory (L2) Final Sign-off
            if (record.signedBy?.includes(finalSignatario || '')) {
              toast.error("O Signatário Autorizado não pode ter participado das etapas anteriores.");
              return;
            }
            updatedRecord.signedBy = [...(record.signedBy || []), finalSignatario];
            updatedRecord.l2ApproverId = finalSignatario;
            updatedRecord.signatarioId = finalSignatario;
            updatedRecord.approvedAt = new Date().toISOString();

            // 📸 Milestone 6: Capture Immutable Snapshot
            const mask = certificateMasks.find(m => m.id === record.certificateMaskId);
            if (mask) {
              const { captureSnapshot } = await import('./utils/calculationEngine');
              updatedRecord.executionSnapshot = await captureSnapshot(record.groups || [], mask.measurementGroups[0].columnDefinitions || []);
              updatedRecord.engineVersion = "v4.0.0-PROD";
              updatedRecord.componentVersions = {
                calculationEngine: "v2.1",
                metrologyEngine: "v1.5",
                formulaParser: "v2.0",
                complianceEngine: "v4.0"
              };
            }

            // ✍️ Milestone 2: Generate ICP-Brasil Compliant Signature
            const { signDocument } = await import('./utils/signatureService');
            const signatureActorId = finalSignatario || userId;
            const signature = await signDocument(updatedRecord, signatureActorId, 'APPROVER', employees.find(e => e.id === signatureActorId)?.nome || employee?.nome || 'Signatário');
            (updatedRecord as any).digitalSignature = signature;
          }

          if (justification === 'Publicado pelo portal') {
            updatedRecord.isPublished = true;
          } else if (justification === 'Despublicado pelo portal') {
            updatedRecord.isPublished = false;
          }

          await saveItem('calibration_records', updatedRecord);

          const so = serviceOrders.find(s => s.id === record.serviceOrderId);
          if (so) await saveItem('service_orders', { ...so, statusCertificado: status });
        }
      }}

      onCreateRevision={async (original) => {
        // Find highest existing revision number for this certificate chain
        const chain = calibrationRecords.filter(r =>
          r.revisionOf === original.id || r.id === original.id
        );
        const nextRev = chain.length; // rev 1 = first revision, etc.
        const newRecord = {
          ...original,
          id: `${original.id}-REV${nextRev}`,
          certificateNumber: `${original.certificateNumber} REV ${nextRev}`,
          status: CertificateStatus.BEING_MADE,
          revisionOf: original.id,
          revisionNumber: nextRev,
          isDraft: false,
          headerSaved: true,
          l1ApproverId: undefined,
          l2ApproverId: undefined,
          returnJustification: undefined,
          submittedBy: undefined,
        };
        await saveItem('calibration_records', newRecord);
      }}
      onSaveStandardInstrument={(si) => saveItem('standard_instruments', si)}
      onDeleteStandardInstrument={(id) => deleteItem('standard_instruments', id)}
      onSaveProcedure={(p) => saveItem('procedures', p)}
      onDeleteProcedure={(id) => deleteItem('procedures', id)}
    />
  );
}

function TechnicalWrapper() {
  const { serviceOrders, clients, quotes, instrumentTypes, certificateMasks, calibrationRecords, standardInstruments, procedures, documentTemplates, employees, saveItem, deleteItem } = useData();
  return (
    <TechnicalModule
      serviceOrders={serviceOrders}
      clients={clients}
      quotes={quotes}
      instrumentTypes={instrumentTypes}
      certificateMasks={certificateMasks}
      calibrationRecords={calibrationRecords}
      standardInstruments={standardInstruments}
      procedures={procedures}
      documentTemplates={documentTemplates}
      employees={employees}
      onCalibrationRecordSubmit={() => { }}
      onSaveServiceOrder={(so: any) => saveItem('service_orders', so)}
      onSaveCalibrationRecord={async (record: any) => {
        await saveItem('calibration_records', record);
        const so = serviceOrders.find(s => s.id === record.serviceOrderId);
        if (so) await saveItem('service_orders', { ...so, statusCertificado: CertificateStatus.IN_ANALYSIS });
      }}
      onSaveCertificateMask={(mask) => saveItem('certificate_masks', mask)}
      onDeleteCertificateMask={(id) => deleteItem('certificate_masks', id)}
      onUpdateCertificateStatus={async (recordId, status, justification) => {
        const record = calibrationRecords.find(r => r.id === recordId);
        if (record) {
          let updatedRecord = { ...record, status, returnJustification: justification };
          if (justification === 'Publicado pelo portal') {
            updatedRecord.isPublished = true;
          } else if (justification === 'Despublicado pelo portal') {
            updatedRecord.isPublished = false;
          }
          await saveItem('calibration_records', updatedRecord);
          
          const so = serviceOrders.find(s => s.id === record.serviceOrderId);
          if (so) await saveItem('service_orders', { ...so, statusCertificado: status });
        }
      }}
    />
  );
}

function FinanceWrapper() {
  const { quotes, serviceOrders, clients, financialControls, paymentMethods, saveItem, deleteItem } = useData();
  return (
    <FinanceModule
      quotes={quotes}
      serviceOrders={serviceOrders}
      clients={clients}
      financialControls={financialControls}
      paymentMethods={paymentMethods}
      onFinancialControlsChange={async (newFc) => {
        await Promise.all(newFc.map(fc => saveItem('financial_controls', fc)));
      }}
      onSaveFinancialControl={(fc) => saveItem('financial_controls', fc)}
      onDeleteFinancialControl={(id) => deleteItem('financial_controls', id)}
      onSavePaymentMethod={(pm) => saveItem('payment_methods', pm)}
      onDeletePaymentMethod={(id) => deleteItem('payment_methods', id)}
    />
  );
}

function GeneralRegistersWrapper() {
  const { employees, banks, unitsOfMeasure, paymentMethods, documentTemplates, saveItem, deleteItem } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const subTab = searchParams.get('tab') || 'employees';

  return (
    <GeneralRegistersModule
      employees={employees}
      banks={banks}
      unitsOfMeasure={unitsOfMeasure}
      paymentMethods={paymentMethods}
      documentTemplates={documentTemplates}
      onSaveEmployee={(e) => saveItem('employees', e)}
      onDeleteEmployee={(id) => deleteItem('employees', id)}
      onSaveBank={(b) => saveItem('banks', b)}
      onDeleteBank={(id) => deleteItem('banks', id)}
      onSaveUnit={(u) => saveItem('units_of_measure', u)}
      onDeleteUnit={(id) => deleteItem('units_of_measure', id)}
      onSavePaymentMethod={(pm) => saveItem('payment_methods', pm)}
      onDeletePaymentMethod={(id) => deleteItem('payment_methods', id)}
      onSaveDocumentTemplate={(doc) => saveItem('document_templates', doc)}
    />
  );
}
