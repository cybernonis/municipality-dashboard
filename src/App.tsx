import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import ReportDetail from './pages/ReportDetail';
import Analytics from './pages/Analytics';
import MapPage from './pages/Map';
import Departments from './pages/Departments';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Chatbot from './components/Chatbot';

const isLoggedIn = () => !!localStorage.getItem('token');

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/*" element={
          isLoggedIn() ? (
            <div className="min-h-screen bg-gray-100">
              <Navbar />
              <div className="max-w-7xl mx-auto">
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" />} />
                  <Route path="/dashboard"   element={<Dashboard />} />
                  <Route path="/reports"     element={<Reports />} />
                  <Route path="/reports/:id" element={<ReportDetail />} />
                  <Route path="/analytics"   element={<Analytics />} />
                  <Route path="/map"         element={<MapPage />} />
                  <Route path="/departments" element={<Departments />} />
                  <Route path="/settings"    element={<Settings />} />
                </Routes>
              </div>
              <Chatbot />
            </div>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;