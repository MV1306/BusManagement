const BASE: string = import.meta.env.VITE_API_BASE ?? 'https://192.168.29.141/TransitOpsAPI/api';

type ApiErrorHandler = (msg: string) => void;
let _onError: ApiErrorHandler | null = null;
export function setApiErrorHandler(fn: ApiErrorHandler) { _onError = fn; }

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getToken() { return localStorage.getItem('token'); }
export function setToken(t: string | null) { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); }

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...options,
  });
  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const msg = `${res.status} ${res.statusText}`;
    _onError?.(msg);
    throw new Error(msg);
  }
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

export interface StopCoord {
  name: string;
  lat?: number | null;
  lng?: number | null;
  isStageStart: boolean;
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
    busTypes: BusType[];
    stopCoords: StopCoord[];
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
    stopCoords: StopCoord[];
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

// ── Auth ──────────────────────────────────────────────────────────────────

export interface AuthResponse { token: string; role: string; username: string; }

export const authApi = {
  login: (username: string, password: string) =>
    req<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, password: string) =>
    req<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
};

// ── Stops ──────────────────────────────────────────────────────────────────

export interface MergeResult {
  keptStopId: number;
  deletedStopId: number;
  affectedRoutes: number;
}

export interface StopRouteStop {
  stopOrder: number;
  stopName: string;
  stopCode: string;
  latitude?: number | null;
  longitude?: number | null;
  isFirstStop: boolean;
  isLastStop: boolean;
}

export interface StopRouteResult {
  routeId: number;
  routeCode: string;
  routeName: string;
  isActive: boolean;
  stopOrderOnRoute: number;
  totalStops: number;
  totalDistanceKm: number;
  busTypes: string[];
  stops: StopRouteStop[];
}

export interface StopRoutesResponse {
  stop: Stop;
  routes: StopRouteResult[];
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
  getRoutes: (stopId: number) => req<StopRoutesResponse>(`/stops/${stopId}/routes`),
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
  recentRoutes: RecentRoute[];
  topRoutesByStops: TopRoute[];
  stopsLast7Days: DailyCount[];
}

export interface RecentRoute {
  routeId: number;
  routeCode: string;
  routeName: string;
  stopCount: number;
  totalDistanceKm: number;
  busTypes: string[];
  createdDate: string;
  isActive: boolean;
}

export interface TopRoute {
  routeId: number;
  routeCode: string;
  routeName: string;
  stopCount: number;
  totalDistanceKm: number;
}

export interface DailyCount {
  date: string;
  count: number;
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
      .then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.json() as Promise<ImportResult>; });
  },
  routes: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/import/routes`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.json() as Promise<ImportResult>; });
  },
  fares: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch(`${BASE}/import/fares`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.json() as Promise<ImportResult>; });
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

// ── Translations ─────────────────────────────────────────────────────────

export interface StopTranslation {
  stopId: number;
  originalName: string;
  originalShortName?: string | null;
  translatedName?: string | null;
  translatedShortName?: string | null;
}

export interface StageTranslation {
  routeStageId: number;
  originalName: string;
  translatedName?: string | null;
}

export interface BulkTranslateResult {
  translated: number;
  message: string;
  samples?: { stopId?: number; routeStageId?: number; translatedName: string; translatedShortName?: string }[];
}

export const translationApi = {
  getStop: (id: number) => req<StopTranslation>(`/translation/stops/${id}`),
  saveStop: (id: number, translatedName: string, translatedShortName?: string) =>
    req<StopTranslation>(`/translation/stops/${id}`, { method: 'POST', body: JSON.stringify({ translatedName, translatedShortName }) }),
  translateAllStops: () =>
    req<BulkTranslateResult>('/translation/stops', { method: 'POST' }),
  getStage: (id: number) => req<StageTranslation>(`/translation/stages/${id}`),
  saveStage: (id: number, translatedName: string) =>
    req<StageTranslation>(`/translation/stages/${id}`, { method: 'POST', body: JSON.stringify({ translatedName }) }),
  translateAllStages: () =>
    req<BulkTranslateResult>('/translation/stages', { method: 'POST' }),
  downloadStopTemplate: () =>
    fetch(`${BASE}/translation/template/stops`).then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.blob(); }),
  downloadStageTemplate: () =>
    fetch(`${BASE}/translation/template/stages`).then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.blob(); }),
  importStops: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`${BASE}/translation/import/stops`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.json() as Promise<ImportResult>; });
  },
  importStages: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return fetch(`${BASE}/translation/import/stages`, { method: 'POST', body: fd })
      .then(r => { if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); } return r.json() as Promise<ImportResult>; });
  },
};

// ── Journey Planner ─────────────────────────────────────────────────────

export interface JourneyLeg {
  routeCode: string;
  routeName: string;
  boardAt: string;
  alightAt: string;
  stops: number;
  distanceKm: number;
  stages: number;
  fare: number;
}

export interface JourneyPlanResult {
  from: string;
  to: string;
  busType: BusType;
  totalDistanceKm: number;
  totalStops: number;
  transfers: number;
  totalFare: number;
  legs: JourneyLeg[];
}

export const journeyApi = {
  plan: (fromStopId: number, toStopId: number, busType: BusType, criteria = 'ShortestDistance') =>
    req<JourneyPlanResult>(`/journey/plan?fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}&criteria=${criteria}`),
};

// ── Geocoding ─────────────────────────────────────────────────────────────

export const geocodingApi = {
  geocode: (name: string) => req<{ latitude: number; longitude: number }>(`/stops/geocode?name=${encodeURIComponent(name)}`),
};

// ── Route Bus Types ──────────────────────────────────────────────────────

export interface RouteBusType {
  routeBusTypeId: number;
  routeId: number;
  busType: BusType;
}

export const routeBusTypesApi = {
  getByRoute: (routeId: number) => req<RouteBusType[]>(`/routes/${routeId}/bus-types`),
  set: (routeId: number, busTypes: BusType[]) =>
    req<RouteBusType[]>(`/routes/${routeId}/bus-types`, { method: 'PUT', body: JSON.stringify({ busTypes }) }),
};

// ── Export ────────────────────────────────────────────────────────────────

export const exportApi = {
  gtfs: () =>
    fetch(`${BASE}/export/gtfs`).then(r => {
      if (!r.ok) { const msg = `${r.status}`; _onError?.(msg); throw new Error(msg); }
      return r.blob();
    }),
};

// ── MTC Scraper ───────────────────────────────────────────────────────────

export interface MtcStage { order: number; name: string; }
export interface MtcRouteInfo {
  routeCode: string;
  origin: string;
  destination: string;
  totalStages: number;
  stages: MtcStage[];
}

export const mtcApi = {
  getStages: (route: string) => req<MtcRouteInfo>(`/mtc/stages?route=${encodeURIComponent(route)}`),
  importStops: (routeId: number) => req<MtcImportResult>(`/mtc/import-stops/${routeId}`, { method: 'POST' }),
};

export interface MtcImportResult {
  message: string;
  totalStops: number;
  stopsCreated: number;
  stopsMatched: number;
  chaloRouteId: string;
  chaloDirection: string;
}
