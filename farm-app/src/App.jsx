import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Livestock from './pages/Livestock';
import Agriculture from './pages/Agriculture';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="livestock" element={<Livestock />} />
        <Route path="agriculture" element={<Agriculture />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="employees" element={<Employees />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
