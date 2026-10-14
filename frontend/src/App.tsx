import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TelemetryProvider } from "./context/TelemetryContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import MetricDetail from "./pages/MetricDetail";
import FlightOverview from "./pages/FlightOverview";

export default function App() {
  return (
    <TelemetryProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            {/* Pulpit główny: kafelki Live + tabela historii lotów */}
            <Route path="/" element={<Dashboard />} />

            {/* Podstrona pojedynczego wykresu na żywo (np. /metric/battery) */}
            <Route path="/metric/:metricId" element={<MetricDetail />} />

            {/* Podstrona pełnego raportu z zapisanego lotu (np. /flight/FLT-2026-004) */}
            <Route path="/flight/:flightId" element={<FlightOverview />} />

            {/* Obsługa błędnych/nieznanych ścieżek - powrót na Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TelemetryProvider>
  );
}