import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
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
import Staff from './pages/Staff';
import { useEffect, useState } from 'react';
import { requestNotificationPermission, onMessageListener } from './firebase';
import axios from 'axios';
import Participation from './pages/Participation';
import Performance from './pages/Performance';
import Payments from './pages/Payments';
import FinancialReports from './pages/FinancialReports';
import Crisis from './pages/Crisis';
import SLA from './pages/SLA';
import Predictive from './pages/Predictive';
import IoT from './pages/IoT';
import DigitalTwin from './pages/DigitalTwin';
import Leaderboard from './pages/Leaderboard';
import GamificationManagement from './pages/GamificationManagement';
import Announcements from './pages/Announcements';
import Appointments from './pages/Appointments';
import PrivacyPolicy from './pages/PrivacyPolicy';

const API_URL = process.env.REACT_APP_API_URL || 'https://municipality-backend-production.up.railway.app';
const isLoggedIn = () => !!localStorage.getItem('token');

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: '#F0F4F8' }}>
      <Sidebar />
      <main
        className="flex-1 transition-all duration-300 overflow-auto"
        style={{ marginLeft: sidebarCollapsed ? '64px' : '240px' }}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  useEffect(() => {
    const initNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          const userId = localStorage.getItem('user_id');
          if (userId) {
            await axios.post(`${API_URL}/auth/fcm-token`, { user_id: userId, fcm_token: token });
            console.log('FCM token saved to backend');
          }
        }
      } catch (e) {
        console.error('FCM init error:', e);
      }
    };
    initNotifications();
    onMessageListener().then((payload: any) => {
      alert(`🔔 ${payload.notification.title}\n${payload.notification.body}`);
    });
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/*" element={
          isLoggedIn() ? (
            <AppLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard"         element={<Dashboard />} />
                <Route path="/reports"           element={<Reports />} />
                <Route path="/reports/:id"       element={<ReportDetail />} />
                <Route path="/analytics"         element={<Analytics />} />
                <Route path="/map"               element={<MapPage />} />
                <Route path="/departments"       element={<Departments />} />
                <Route path="/settings"          element={<Settings />} />
                <Route path="/participation"     element={<Participation />} />
                <Route path="/performance"       element={<Performance />} />
                <Route path="/payments"          element={<Payments />} />
                <Route path="/financial-reports" element={<FinancialReports />} />
                <Route path="/crisis"            element={<Crisis />} />
                <Route path="/sla"               element={<SLA />} />
                <Route path="/predictive"        element={<Predictive />} />
                <Route path="/iot"               element={<IoT />} />
                <Route path="/digital-twin"      element={<DigitalTwin />} />
                <Route path="/staff"             element={<Staff />} />
                <Route path="/leaderboard"      element={<Leaderboard />} />
                <Route path="/gamification"     element={<GamificationManagement />} />
                <Route path="/announcements"    element={<Announcements />} />
                <Route path="/appointments"     element={<Appointments />} />
              </Routes>
              <Chatbot />
              <AlertBanner />
            </AppLayout>
          ) : (
            <Navigate to="/login" />
          )
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
