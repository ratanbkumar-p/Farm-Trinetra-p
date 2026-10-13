import React, { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { useModules } from './lib/useSections';
import Layout from './components/layout/Layout';
import FarmLoader from './components/ui/FarmLoader';
import Login from './pages/Login';

// Pages are split into their own chunks so the first screen loads fast on rural networks
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Livestock = lazy(() => import('./pages/Livestock'));
const Vegetables = lazy(() => import('./pages/Agriculture'));
const Fruits = lazy(() => import('./pages/Fruits'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Employees = lazy(() => import('./pages/Employees'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Settings = lazy(() => import('./pages/Settings'));
const Invoices = lazy(() => import('./pages/Invoices'));
const ContactsHub = lazy(() => import('./pages/ContactsHub'));
const ProfitCalculator = lazy(() => import('./pages/ProfitCalculator'));

// Crops / Fruits can be switched off in Settings; their pages then redirect home
const ModuleRoute = ({ module, children }) => {
  const modules = useModules();
  return modules[module] ? children : <Navigate to="/" replace />;
};

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <FarmLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="livestock" element={<Livestock />} />
        <Route path="vegetables" element={<ModuleRoute module="crops"><Vegetables /></ModuleRoute>} />
        <Route path="fruits" element={<ModuleRoute module="fruits"><Fruits /></ModuleRoute>} />
        <Route path="calculator" element={<ProfitCalculator />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="employees" element={<Employees />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="contacts" element={<ContactsHub />} />
        <Route path="farm-contacts" element={<Navigate to="/contacts" replace />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
