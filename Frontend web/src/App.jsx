import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import ArgoExplorer from './pages/ArgoExplorer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/dashboard" element={<MainLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="fleet" element={<ArgoExplorer />} />
          <Route path="map" element={<div className="p-8">Live Map View (Coming Soon)</div>} />
          <Route path="history" element={<div className="p-8">Historical Data (Coming Soon)</div>} />
          <Route path="ai" element={<div className="p-8">AI Models (Use Sidebar Link to Chat)</div>} />
          <Route path="reports" element={<div className="p-8">Reports (Coming Soon)</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
