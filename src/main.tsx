import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { AuditProvider } from './contexts/AuditContext';
import { StandardProvider } from './contexts/StandardContext';
import { InstrumentProvider } from './contexts/InstrumentContext';
import { TechnicalProvider } from './contexts/TechnicalContext';
import { QualityProvider } from './contexts/QualityContext';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import { initSentry } from './sentry';
import { ThemeProvider } from './contexts/ThemeContext';
import './index.css';

initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
          <AuditProvider>
            <StandardProvider>
              <InstrumentProvider>
                <TechnicalProvider>
                  <QualityProvider>
                    <DataProvider>
                      <App />
                      <Toaster position="top-right" richColors closeButton />
                    </DataProvider>
                  </QualityProvider>
                </TechnicalProvider>
              </InstrumentProvider>
            </StandardProvider>
          </AuditProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </ErrorBoundary>
  </StrictMode>,
);
