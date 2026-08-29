import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { setApiErrorHandler } from './api';
import { useToast } from './toast';
import { AuthProvider, ProtectedRoute } from './auth';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Stops from './pages/Stops';
import RoutesPage from './pages/Routes';
import Fares from './pages/Fares';
import RouteSearch from './pages/RouteSearch';
import FareCalculator from './pages/FareCalculator';
import FareMatrix from './pages/FareMatrix';
import Import from './pages/Import';
import CoverageMap from './pages/CoverageMap';
import RouteCard from './pages/RouteCard';
import FareAudit from './pages/FareAudit';
import ExportPage from './pages/ExportPage';
import Translations from './pages/Translations';
import JourneyPlanner from './pages/JourneyPlanner';
import RouteBusTypes from './pages/RouteBusTypes';
import MtcScraper from './pages/MtcScraper';

function AppRoutes() {
  const { toast } = useToast();
  useEffect(() => {
    setApiErrorHandler(msg => toast(`API error: ${msg}`, 'error'));
  }, [toast]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />

        {/* Admin only */}
        <Route path="dashboard"    element={<ProtectedRoute roles={['Admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="stops"        element={<ProtectedRoute roles={['Admin']}><Stops /></ProtectedRoute>} />
        <Route path="routes"       element={<ProtectedRoute roles={['Admin']}><RoutesPage /></ProtectedRoute>} />
        <Route path="bustypes"     element={<ProtectedRoute roles={['Admin']}><RouteBusTypes /></ProtectedRoute>} />
        <Route path="fares"        element={<ProtectedRoute roles={['Admin']}><Fares /></ProtectedRoute>} />
        <Route path="import"       element={<ProtectedRoute roles={['Admin']}><Import /></ProtectedRoute>} />
        <Route path="export"       element={<ProtectedRoute roles={['Admin']}><ExportPage /></ProtectedRoute>} />
        <Route path="translations" element={<ProtectedRoute roles={['Admin']}><Translations /></ProtectedRoute>} />
        <Route path="audit"        element={<ProtectedRoute roles={['Admin']}><FareAudit /></ProtectedRoute>} />
        <Route path="mtcscraper"   element={<ProtectedRoute roles={['Admin']}><MtcScraper /></ProtectedRoute>} />

        {/* Admin + User */}
        <Route path="search"     element={<ProtectedRoute roles={['Admin', 'User']}><RouteSearch /></ProtectedRoute>} />
        <Route path="journey"    element={<ProtectedRoute roles={['Admin', 'User']}><JourneyPlanner /></ProtectedRoute>} />
        <Route path="calculator" element={<ProtectedRoute roles={['Admin', 'User']}><FareCalculator /></ProtectedRoute>} />
        <Route path="matrix"     element={<ProtectedRoute roles={['Admin', 'User']}><FareMatrix /></ProtectedRoute>} />
        <Route path="coverage"   element={<ProtectedRoute roles={['Admin', 'User']}><CoverageMap /></ProtectedRoute>} />
        <Route path="routecard"  element={<ProtectedRoute roles={['Admin', 'User']}><RouteCard /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
