import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './Layout';
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"  element={<Dashboard />} />
          <Route path="stops"      element={<Stops />} />
          <Route path="routes"     element={<RoutesPage />} />
          <Route path="fares"      element={<Fares />} />
          <Route path="search"     element={<RouteSearch />} />
          <Route path="journey"    element={<JourneyPlanner />} />
          <Route path="calculator" element={<FareCalculator />} />
          <Route path="matrix"     element={<FareMatrix />} />
          <Route path="import"     element={<Import />} />
          <Route path="coverage"   element={<CoverageMap />} />
          <Route path="routecard"  element={<RouteCard />} />
          <Route path="audit"      element={<FareAudit />} />
          <Route path="export"       element={<ExportPage />} />
          <Route path="translations" element={<Translations />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
