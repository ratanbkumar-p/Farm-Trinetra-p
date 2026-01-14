import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Livestock from './pages/Livestock';
import Vegetables from './pages/Agriculture';
import Fruits from './pages/Fruits';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Settings from './pages/Settings';
import Invoices from './pages/Invoices';
import Login from './pages/Login';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function AppRoutes() {
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
        <Route path="vegetables" element={<Vegetables />} />
        <Route path="fruits" element={<Fruits />} />
        <Route path="agriculture" element={<Vegetables />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="employees" element={<Employees />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
