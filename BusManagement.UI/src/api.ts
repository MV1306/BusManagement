const BASE = 'https://192.168.29.141/TransitOpsAPI/api';

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Stop {
  stopId: number;
  stopCode: string;
  stopName: string;
  shortName?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export type BusType = 'Ordinary' | 'Express' | 'Deluxe' | 'AC';
export const BUS_TYPES: BusType[] = ['Ordinary', 'Express', 'Deluxe', 'AC'];

export interface Route {
  routeId: number;
  routeCode: string;
  routeName: string;
  isActive: boolean;
  startingStop?: string;
  endingStop?: string;
}

export interface RouteStage {
  routeStageId: number;
  stageName: string;
  stageOrder: number;
  distanceFromPreviousKm?: number | null;
  isFirstStage: boolean;
  isLastStage: boolean;
}

export interface RouteStop {
  routeStopId: number;
  stopId: number;
  stopCode: string;
  stopName: string;
  latitude?: number;
  longitude?: number;
  stopOrder: number;
  distanceFromPreviousKm: number;
  routeStageId: number;
  stageName: string;
  isFirstStop: boolean;
  isLastStop: boolean;
}

export interface Fare {
  fareId: number;
  busType: BusType;
  stages: number;
  fareAmount: number;
  isActive: boolean;
}

export interface SearchResult {
  fromStop: string;
  toStop: string;
  routes: {
    routeId: number;
    routeCode: string;
    routeName: string;
    boardingStopOrder: number;
    destinationStopOrder: number;
    stops: number;
    distanceKm: number;
    fare: number | null;
  }[];
}

export interface SmartSearchResult {
  from: string;
  to: string;
  totalDistanceKm: number;
  totalStops: number;
  transfers: number;
  segments: {
    routeCode: string;
    routeName: string;
    fromStop: string;
    toStop: string;
    stops: number;
    distanceKm: number;
  }[];
}

export interface FareCalcResult {
  routeCode: string;
  busType: BusType;
  fromStop: string;
  toStop: string;
  stages: number;
  distanceKm: number;
  fare: number;
}

export interface FareCalcAllTypesResult {
  routeCode: string;
  fromStop: string;
  toStop: string;
  stages: number;
  totalStops: number;
  distanceKm: number;
  fares: { busType: BusType; stages: number; totalStops: number; distanceKm: number; fare: number }[];
}

export interface SmartFareResult {
  from: string;
  to: string;
  segments: { routeCode: string; busType: BusType; fromStop: string; toStop: string; stages: number; fare: number }[];
  totalFare: number;
}

// ── Stops ──────────────────────────────────────────────────────────────────

export interface MergeResult {
  keptStopId: number;
  deletedStopId: number;
  affectedRoutes: number;
}

export const stopsApi = {
  getAll: (page = 1, pageSize = 50, search = '') => req<PagedResult<Stop>>(`/stops?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getAllUnpaged: () => req<PagedResult<Stop>>('/stops?page=1&pageSize=10000'),  // for autocomplete
  getById: (id: number) => req<Stop>(`/stops/${id}`),
  create: (body: Omit<Stop, 'stopId' | 'isActive'> & { createdBy?: string }) =>
    req<Stop>('/stops', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Stop> & { modifiedBy?: string }) =>
    req<Stop>(`/stops/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => req<void>(`/stops/${id}`, { method: 'DELETE' }),
  merge: (keepId: number, deleteId: number) =>
    req<MergeResult>(`/stops/${keepId}/merge`, { method: 'POST', body: JSON.stringify({ mergeIntoStopId: deleteId }) }),
};

// ── Routes ─────────────────────────────────────────────────────────────────

export const routesApi = {
  getAll: (page = 1, pageSize = 50, search = '') => req<PagedResult<Route>>(`/routes?page=${page}&pageSize=${pageSize}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getAllUnpaged: () => req<PagedResult<Route>>('/routes?page=1&pageSize=10000'),
  getById: (id: number) => req<Route>(`/routes/${id}`),
  create: (body: { routeCode: string; routeName: string; createdBy?: string }) =>
    req<Route>('/routes', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: Partial<Route> & { modifiedBy?: string }) =>
    req<Route>(`/routes/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  setStatus: (id: number, isActive: boolean) =>
    req<Route>(`/routes/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) }),
  delete: (id: number) => req<void>(`/routes/${id}`, { method: 'DELETE' }),
  duplicate: (routeId: number, body: { newRouteCode: string; newRouteName: string }) =>
    req<Route>(`/routes/${routeId}/duplicate`, { method: 'POST', body: JSON.stringify(body) }),
  getCard: (routeId: number) => req<RouteCard>(`/routes/${routeId}/card`),
  getStages: (routeId: number) => req<RouteStage[]>(`/routes/${routeId}/stages`),
  addStage: (routeId: number, body: { stageName: string; stageOrder: number; distanceFromPreviousKm?: number }) =>
    req<RouteStage>(`/routes/${routeId}/stages`, { method: 'POST', body: JSON.stringify(body) }),
  updateStage: (routeId: number, stageId: number, body: { stageName: string; stageOrder: number; distanceFromPreviousKm?: number }) =>
    req<RouteStage>(`/routes/${routeId}/stages/${stageId}`, { method: 'PUT', body: JSON.stringify(body) }),
  reorderStages: (routeId: number, stages: { routeStageId: number; stageOrder: number }[]) =>
    req<void>(`/routes/${routeId}/stages/reorder`, { method: 'PUT', body: JSON.stringify({ stages }) }),
  deleteStage: (routeId: number, stageId: number) =>
    req<void>(`/routes/${routeId}/stages/${stageId}`, { method: 'DELETE' }),
  getStops: (routeId: number) => req<RouteStop[]>(`/routes/${routeId}/stops`),
  addStop: (routeId: number, body: { stopId: number; routeStageId: number; stopOrder: number; distanceFromPreviousKm: number }) =>
    req<RouteStop>(`/routes/${routeId}/stops`, { method: 'POST', body: JSON.stringify(body) }),
  removeStop: (routeId: number, routeStopId: number) =>
    req<void>(`/routes/${routeId}/stops/${routeStopId}`, { method: 'DELETE' }),
  reorderStops: (routeId: number, stops: { routeStopId: number; stopOrder: number; distanceKm: number }[]) =>
    req<void>(`/routes/${routeId}/stops/reorder`, { method: 'PUT', body: JSON.stringify(stops.map(s => ({ routeStopId: s.routeStopId, stopOrder: s.stopOrder, distanceFromPreviousKm: s.distanceKm }))) }),
  search: (fromStopId: number, toStopId: number) =>
    req<SearchResult>(`/routes/search?fromStopId=${fromStopId}&toStopId=${toStopId}`),
  smartSearch: (fromStopId: number, toStopId: number, criteria = 'ShortestDistance') =>
    req<SmartSearchResult>(`/routes/smart-search?fromStopId=${fromStopId}&toStopId=${toStopId}&criteria=${criteria}`),
};

// ── Dashboard ────────────────────────────────────────────────────────────

export interface DashboardSummary {
  totalStops: number;
  activeStops: number;
  inactiveStops: number;
  totalRoutes: number;
  activeRoutes: number;
  inactiveRoutes: number;
  totalFareEntries: number;
  routesWithNoStops: number;
  stopsWithNoCoordinates: number;
  lastImportedAt: string | null;
}

export const dashboardApi = {
  getSummary: () => req<DashboardSummary>('/dashboard/summary'),
};

// ── Import ────────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

export const importApi = {
  stops: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/import/stops`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<ImportResult>; });
  },
  routes: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/import/routes`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<ImportResult>; });
  },
  fares: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/import/fares`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json() as Promise<ImportResult>; });
  },
};

// ── Coverage & Nearby ────────────────────────────────────────────────────

export interface CoverageStop {
  stopOrder: number;
  stopName: string;
  stopCode: string;
  latitude: number;
  longitude: number;
  isFirstStop: boolean;
  isLastStop: boolean;
}

export interface CoverageRoute {
  routeId: number;
  routeCode: string;
  routeName: string;
  isActive: boolean;
  stops: CoverageStop[];
}

export interface NearbyStop extends Stop {
  distanceKm: number;
}

export interface RouteCardStop {
  stopOrder: number;
  stopCode: string;
  stopName: string;
  distanceFromPreviousKm: number;
  cumulativeDistanceKm: number;
  isFirstStop: boolean;
  isLastStop: boolean;
}

export interface RouteCard {
  routeCode: string;
  routeName: string;
  startingStop: string;
  endingStop: string;
  totalStops: number;
  totalDistanceKm: number;
  isActive: boolean;
  stops: RouteCardStop[];
  fares: { busType: BusType; stages: number; fareAmount: number }[];
}

export const coverageApi = {
  getAll: () => req<CoverageRoute[]>('/routes/coverage'),
  getNearby: (latitude: number, longitude: number, radiusKm = 3) =>
    req<NearbyStop[]>(`/stops/nearby?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`),
};

// ── Fares ──────────────────────────────────────────────────────────────────

export interface AuditLog {
  auditId: number;
  fareId: number;
  busType: BusType;
  stages: number;
  oldAmount: number | null;
  newAmount: number | null;
  action: 'Created' | 'Updated' | 'Deleted';
  changedBy: string;
  changedAt: string;
}

export const faresApi = {
  getById: (id: number) => req<Fare>(`/fares/${id}`),
  getAudit: (page = 1, pageSize = 50) =>
    req<AuditLog[]>(`/fares/audit?page=${page}&pageSize=${pageSize}`),
  getByBusType: (busType: BusType) => req<Fare[]>(`/fares/bus-type/${busType}`),
  create: (body: { busType: BusType; stages: number; fareAmount: number }) =>
    req<Fare>('/fares', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: { fareAmount: number; isActive?: boolean }) =>
    req<Fare>(`/fares/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (id: number) => req<void>(`/fares/${id}`, { method: 'DELETE' }),
  calculate: (routeId: number, fromStopId: number, toStopId: number, busType: BusType) =>
    req<FareCalcResult>(`/fares/calculate?routeId=${routeId}&fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}`),
  calculateAllTypes: (routeId: number, fromStopId: number, toStopId: number) =>
    req<FareCalcAllTypesResult>(`/fares/calculate-all-types?routeId=${routeId}&fromStopId=${fromStopId}&toStopId=${toStopId}`),
  calculateSmart: (fromStopId: number, toStopId: number, busType: BusType, criteria: 'ShortestDistance' | 'FewestStops' | 'FewestTransfers' = 'ShortestDistance') =>
    req<SmartFareResult>(`/fares/calculate-smart?fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}&criteria=${criteria}`),
};

// ── Export ────────────────────────────────────────────────────────────────

export const exportApi = {
  gtfs: () =>
    fetch(`${BASE}/export/gtfs`).then(r => {
      if (!r.ok) throw new Error(`${r.status}`);
      return r.blob();
    }),
};
