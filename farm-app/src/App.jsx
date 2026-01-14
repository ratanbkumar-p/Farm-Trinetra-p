import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Livestock from './pages/Livestock';
import Vegetables from './pages/Agriculture'; // Renamed from Agriculture
import Fruits from './pages/Fruits';
import Expenses from './pages/Expenses';
import Employees from './pages/Employees';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="livestock" element={<Livestock />} />
        <Route path="vegetables" element={<Vegetables />} />
        <Route path="fruits" element={<Fruits />} />
        <Route path="agriculture" element={<Vegetables />} /> {/* Legacy redirect */}
        <Route path="expenses" element={<Expenses />} />
        <Route path="employees" element={<Employees />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
