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
import AlertBanner from './components/AlertBanner';
import { useEffect } from 'react';
import { requestNotificationPermission, onMessageListener } from './firebase';
import Participation from './pages/Participation';
import Performance from './pages/Performance';
import Payments from './pages/Payments';
import FinancialReports from './pages/FinancialReports';
import Crisis from './pages/Crisis';
import SLA from './pages/SLA';
import Predictive from './pages/Predictive';
import IoT from './pages/IoT';
import DigitalTwin from './pages/DigitalTwin';

const isLoggedIn = () => !!localStorage.getItem('token');

function App() {
  useEffect(() => {
  requestNotificationPermission();
  
  onMessageListener().then((payload: any) => {
    alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
  });
}, []);
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
                  <Route path="/participation" element={<Participation />} />
                  <Route path="/performance" element={<Performance />} />
                  <Route path="/payments" element={<Payments />} />
                  <Route path="/financial-reports" element={<FinancialReports />} />
                  <Route path="/crisis" element={<Crisis />} />
                  <Route path="/sla" element={<SLA />} />
                  <Route path="/predictive" element={<Predictive />} />
                  <Route path="/iot" element={<IoT />} />
                  <Route path="/digital-twin" element={<DigitalTwin />} />
                </Routes>
              </div>
              <Chatbot />
              <AlertBanner />
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