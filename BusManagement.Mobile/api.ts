// Change this to your server's IP when testing on a physical device
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

// ── Types ──────────────────────────────────────────────────────────────────

export interface Stop {
  stopId: number;
  stopCode: string;
  stopName: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface NearbyStop extends Stop {
  distanceKm: number;
}

export interface Route {
  routeId: number;
  routeCode: string;
  routeName: string;
  isActive: boolean;
  startingStop?: string;
  endingStop?: string;
}

export type BusType = 'Ordinary' | 'Express' | 'Deluxe' | 'AC';
export const BUS_TYPES: BusType[] = ['Ordinary', 'Express', 'Deluxe', 'AC'];

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
  }[];
}

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

export interface FareCalcAllTypesResult {
  routeCode: string;
  fromStop: string;
  toStop: string;
  stages: number;
  totalStops: number;
  distanceKm: number;
  fares: { busType: BusType; stages: number; fare: number }[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
}

// ── API ────────────────────────────────────────────────────────────────────

export const stopsApi = {
  search: (q: string) =>
    req<PagedResult<Stop>>(`/stops?page=1&pageSize=20&search=${encodeURIComponent(q)}`),
  getNearby: (lat: number, lng: number, radiusKm = 1) =>
    req<NearbyStop[]>(`/stops/nearby?latitude=${lat}&longitude=${lng}&radiusKm=${radiusKm}`),
};

export const routesApi = {
  search: (fromStopId: number, toStopId: number) =>
    req<SearchResult>(`/routes/search?fromStopId=${fromStopId}&toStopId=${toStopId}`),
};

export const journeyApi = {
  plan: (fromStopId: number, toStopId: number, busType: BusType, criteria = 'ShortestDistance') =>
    req<JourneyPlanResult>(
      `/journey/plan?fromStopId=${fromStopId}&toStopId=${toStopId}&busType=${busType}&criteria=${criteria}`
    ),
};

export const faresApi = {
  calculateAllTypes: (routeId: number, fromStopId: number, toStopId: number) =>
    req<FareCalcAllTypesResult>(
      `/fares/calculate-all-types?routeId=${routeId}&fromStopId=${fromStopId}&toStopId=${toStopId}`
    ),
};
