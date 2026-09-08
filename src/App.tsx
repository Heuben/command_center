import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { DispatchProvider } from './contexts/DispatchContext';
import { ToastProvider } from './contexts/ToastContext';
import { AppLayout } from './components/layout/AppLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Personnel } from './pages/Personnel';
import { AuditLogs } from './pages/AuditLogs';
import { IncidentHistory } from './pages/IncidentHistory';
import { BranchManagement } from './pages/BranchManagement';
import { Settings } from './pages/Settings';

export function App() {
  return (
    <SessionProvider>
      <DispatchProvider>
        <ToastProvider>
          <BrowserRouter>
          <div className="h-full w-full bg-canvas font-sans text-ink antialiased">
            <Routes>
              <Route
                path="/login"
                element={
                <ErrorBoundary>
                    <Login />
                  </ErrorBoundary>
                } />
              
              <Route
                element={
                <ErrorBoundary>
                    <AppLayout />
                  </ErrorBoundary>
                }>
                <Route path="/" element={<Dashboard />} />
                <Route path="/personnel" element={<Personnel />} />
                <Route path="/audit" element={<AuditLogs />} />
                <Route path="/incidents" element={<IncidentHistory />} />
                <Route path="/branches" element={<BranchManagement />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Routes>
          </div>
        </BrowserRouter>
        </ToastProvider>
      </DispatchProvider>
    </SessionProvider>);

}