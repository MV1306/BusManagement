export const BASE = 'http://192.168.29.141/TransitOpsAPI/api';

async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  console.log('[API] -->', options?.method ?? 'GET', url);
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    console.log('[API] <--', res.status, url);
    if (res.status === 204) return undefined as T;
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`${res.status} ${res.statusText}: ${body}`);
    }
    return res.json();
  } catch (e: any) {
    console.error('[API] ERR', url, e.message);
    throw e;
  }
}

export interface PagedResult<T> { items: T[]; totalCount: number; }
export interface Stop { stopId: number; stopCode: string; stopName: string; latitude?: number | null; longitude?: number | null; isActive: boolean; }
export interface NearbyStop extends Stop { distanceKm: number; }
export interface Route { routeId: number; routeCode: string; routeName: string; isActive: boolean; startingStop?: string; endingStop?: string; }
export interface RouteStop { routeStopId: number; stopId: number; stopCode: string; stopName: string; stopOrder: number; distanceFromPreviousKm: number; routeStageId: number; stageName: string; isFirstStop: boolean; isLastStop: boolean; }

export type BusType = 'Ordinary' | 'Express' | 'Deluxe' | 'AC';
export const BUS_TYPES: BusType[] = ['Ordinary', 'Express', 'Deluxe', 'AC'];
export type Criteria = 'ShortestDistance' | 'FewestStops' | 'FewestTransfers';
export const CRITERIA: { value: Criteria; label: string; desc: string }[] = [
  { value: 'ShortestDistance', label: 'Shortest Distance', desc: 'Minimise total km' },
  { value: 'FewestStops',      label: 'Fewest Stops',      desc: 'Minimise stop count' },
  { value: 'FewestTransfers',  label: 'Fewest Transfers',  desc: 'Minimise bus changes' },
];

export interface SearchResult {
  fromStop: string; toStop: string;
  routes: { routeId: number; routeCode: string; routeName: string; stops: number; distanceKm: number; fare: number | null; busTypes: BusType[]; }[];
}
export interface SmartSearchResult {
  from: string; to: string; totalDistanceKm: number; totalStops: number; transfers: number;
  segments: { routeCode: string; routeName: string; fromStop: string; toStop: string; stops: number; distanceKm: number; }[];
}
export interface JourneyLeg { routeCode: string; routeName: string; boardAt: string; alightAt: string; stops: number; distanceKm: number; stages: number; fare: number; }
export interface JourneyPlanResult { from: string; to: string; busType: BusType; totalDistanceKm: number; totalStops: number; transfers: number; totalFare: number; legs: JourneyLeg[]; }
export interface FareCalcAllTypesResult { routeCode: string; fromStop: string; toStop: string; stages: number; totalStops: number; distanceKm: number; fares: { busType: BusType; stages: number; fare: number }[]; }
export interface SmartFareResult { from: string; to: string; segments: { routeCode: string; busType: BusType; fromStop: string; toStop: string; stages: number; fare: number }[]; totalFare: number; }
export interface RouteBusType { routeBusTypeId: number; routeId: number; busType: BusType; }

export const stopsApi = {
  search: (q: string) => req<PagedResult<Stop>>(`/stops?page=1&pageSize=20&search=${encodeURIComponent(q)}`),
  getNearby: (lat: number, lng: number, radiusKm = 1) => req<NearbyStop[]>(`/stops/nearby?latitude=${lat}&longitude=${lng}&radiusKm=${radiusKm}`),
};
export const routesApi = {
  search: (fromStopId: number, toStopId: number) => req<SearchResult>(`/routes/search?fromStopId=${fromStopId}&toStopId=${toStopId}`),
  smartSearch: (fromStopId: number, toStopId: number, criteria: Criteria = 'ShortestDistance') => req<SmartSearchResult>(`/routes/smart-search?fromStopId=${fromStopId}&toStopId=${toStopId}&criteria=${criteria}`),
  getStops: (routeId: number) => req<RouteStop[]>(`/routes/${routeId}/stops`),
  searchAll: (q: string) => req<PagedResult<Route>>(`/routes?page=1&pageSize=20&search=${encodeURIComponent(q)}`),
};
export const journeyApi = {
  plan: (fromStopId: number, toStopId: number, busType: BusType, criteria: Criteria = 'ShortestDistance') =>
    req<JourneyPlanResult>(`/journey/plan?fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}&criteria=${criteria}`),
};
export const faresApi = {
  calculateAllTypes: (routeId: number, fromStopId: number, toStopId: number) =>
    req<FareCalcAllTypesResult>(`/fares/calculate-all-types?routeId=${routeId}&fromStopId=${fromStopId}&toStopId=${toStopId}`),
  calculateSmart: (fromStopId: number, toStopId: number, busType: BusType, criteria: Criteria = 'ShortestDistance') =>
    req<SmartFareResult>(`/fares/calculate-smart?fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}&criteria=${criteria}`),
};
export const routeBusTypesApi = {
  getByRoute: (routeId: number) => req<RouteBusType[]>(`/routes/${routeId}/bus-types`),
};
