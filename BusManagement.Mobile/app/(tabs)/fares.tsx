import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import RouteSearchInput from '../../components/RouteSearchInput';
import {
  Stop, Route, RouteStop, BusType, BUS_TYPES, Criteria, CRITERIA,
  FareCalcAllTypesResult, SmartFareResult,
  faresApi, routesApi, routeBusTypesApi,
} from '../../api';

type Mode = 'route' | 'smart' | 'concession';

const CONCESSIONS = [
  { label: 'Full Fare',          key: 'full',    pct: 0   },
  { label: 'Student',            key: 'student', pct: 50  },
  { label: 'Senior Citizen',     key: 'senior',  pct: 30  },
  { label: 'Differently Abled',  key: 'pwd',     pct: 75  },
  { label: 'Freedom Fighter',    key: 'ff',      pct: 100 },
];

const BUS_TYPE_COLORS: Record<string, string> = {
  Ordinary: '#888', Express: '#4caf50', Deluxe: '#2196f3', AC: '#f44336',
};

export default function FaresScreen() {
  const [mode, setMode] = useState<Mode>('route');

  // route mode
  const [route, setRoute] = useState<Route | null>(null);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [routeBusTypes, setRouteBusTypes] = useState<BusType[]>([]);
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [allTypesResult, setAllTypesResult] = useState<FareCalcAllTypesResult | null>(null);

  // smart mode
  const [smartFrom, setSmartFrom] = useState<Stop | null>(null);
  const [smartTo, setSmartTo] = useState<Stop | null>(null);
  const [smartBusType, setSmartBusType] = useState<BusType>('Ordinary');
  const [smartCriteria, setSmartCriteria] = useState<Criteria>('ShortestDistance');
  const [smartResult, setSmartResult] = useState<SmartFareResult | null>(null);

  // concession mode
  const [concRoute, setConcRoute] = useState<Route | null>(null);
  const [concRouteStops, setConcRouteStops] = useState<RouteStop[]>([]);
  const [concRouteBusTypes, setConcRouteBusTypes] = useState<BusType[]>([]);
  const [concFrom, setConcFrom] = useState<Stop | null>(null);
  const [concTo, setConcTo] = useState<Stop | null>(null);
  const [concBusType, setConcBusType] = useState<BusType>('Ordinary');
  const [concResult, setConcResult] = useState<FareCalcAllTypesResult | null>(null);

  const [loading, setLoading] = useState(false);

  // load route stops when route selected
  useEffect(() => {
    if (!route) { setRouteStops([]); setRouteBusTypes([]); setFrom(null); setTo(null); return; }
    routesApi.getStops(route.routeId).then(setRouteStops);
    routeBusTypesApi.getByRoute(route.routeId).then(r => setRouteBusTypes(r.map(t => t.busType))).catch(() => setRouteBusTypes([]));
    setFrom(null); setTo(null);
  }, [route]);

  useEffect(() => {
    if (!concRoute) { setConcRouteStops([]); setConcRouteBusTypes([]); setConcFrom(null); setConcTo(null); return; }
    routesApi.getStops(concRoute.routeId).then(setConcRouteStops);
    routeBusTypesApi.getByRoute(concRoute.routeId).then(r => {
      const types = r.map(t => t.busType);
      setConcRouteBusTypes(types);
      if (types.length > 0 && !types.includes(concBusType)) setConcBusType(types[0]);
    }).catch(() => setConcRouteBusTypes([]));
    setConcFrom(null); setConcTo(null);
  }, [concRoute]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setAllTypesResult(null); setSmartResult(null); setConcResult(null);
  };

  // Convert RouteStop[] to Stop[] for StopSearchInput
  const toStopList = (rs: RouteStop[]): Stop[] => rs.map(r => ({
    stopId: r.stopId, stopCode: r.stopCode, stopName: r.stopName,
    latitude: undefined, longitude: undefined, isActive: true,
  }));

  const calcRoute = async () => {
    if (!route || !from || !to) { Alert.alert('Select route and both stops'); return; }
    setLoading(true); setAllTypesResult(null);
    try { setAllTypesResult(await faresApi.calculateAllTypes(route.routeId, from.stopId, to.stopId)); }
    catch { Alert.alert('Calculation failed. Route or stops not found.'); }
    finally { setLoading(false); }
  };

  const calcSmart = async () => {
    if (!smartFrom || !smartTo) { Alert.alert('Select both stops'); return; }
    setLoading(true); setSmartResult(null);
    try { setSmartResult(await faresApi.calculateSmart(smartFrom.stopId, smartTo.stopId, smartBusType, smartCriteria)); }
    catch { Alert.alert('Calculation failed.'); }
    finally { setLoading(false); }
  };

  const calcConc = async () => {
    if (!concRoute || !concFrom || !concTo) { Alert.alert('Select route and both stops'); return; }
    setLoading(true); setConcResult(null);
    try { setConcResult(await faresApi.calculateAllTypes(concRoute.routeId, concFrom.stopId, concTo.stopId)); }
    catch { Alert.alert('Calculation failed.'); }
    finally { setLoading(false); }
  };

  // For route mode stop search — use route stops if loaded, else free search
  const routeStopList = toStopList(routeStops);
  const concStopList = toStopList(concRouteStops);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Mode tabs */}
        <View style={styles.tabRow}>
          {(['route', 'smart', 'concession'] as Mode[]).map(m => (
            <TouchableOpacity key={m} style={[styles.tab, mode === m && styles.tabActive]} onPress={() => switchMode(m)}>
              <Text style={[styles.tabText, mode === m && styles.tabTextActive]}>
                {m === 'route' ? 'By Route' : m === 'smart' ? 'Smart' : 'Concession'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── BY ROUTE ── */}
        {mode === 'route' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Fare by Route</Text>
            <RouteSearchInput label="Route" value={route} onSelect={r => { setRoute(r); setAllTypesResult(null); }} />
            <StopSearchInput
              label="From Stop"
              value={from}
              onSelect={setFrom}
              overrideList={routeStopList.length > 0 ? routeStopList : undefined}
            />
            <StopSearchInput
              label="To Stop"
              value={to}
              onSelect={setTo}
              overrideList={routeStopList.length > 0 ? routeStopList : undefined}
            />
            <TouchableOpacity style={styles.btn} onPress={calcRoute} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Calculate Fare</Text>}
            </TouchableOpacity>
            {allTypesResult && <RouteTicket result={allTypesResult} />}
          </View>
        )}

        {/* ── SMART JOURNEY ── */}
        {mode === 'smart' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Smart Journey Fare</Text>
            <StopSearchInput label="From Stop" value={smartFrom} onSelect={setSmartFrom} />
            <StopSearchInput label="To Stop" value={smartTo} onSelect={setSmartTo} />
            <Text style={styles.sectionLabel}>Bus Type</Text>
            <View style={styles.pillRow}>
              {BUS_TYPES.map(bt => (
                <TouchableOpacity key={bt} style={[styles.pill, smartBusType === bt && styles.pillActive]} onPress={() => setSmartBusType(bt)}>
                  <Text style={[styles.pillText, smartBusType === bt && styles.pillTextActive]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.sectionLabel}>Route Criteria</Text>
            {CRITERIA.map(c => (
              <TouchableOpacity key={c.value} style={[styles.criteriaBtn, smartCriteria === c.value && styles.criteriaBtnActive]} onPress={() => setSmartCriteria(c.value)}>
                <Text style={[styles.criteriaLabel, smartCriteria === c.value && styles.criteriaLabelActive]}>{c.label}</Text>
                <Text style={[styles.criteriaDesc, smartCriteria === c.value && styles.criteriaDescActive]}>{c.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={calcSmart} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Calculate Fare</Text>}
            </TouchableOpacity>
            {smartResult && <SmartTicket result={smartResult} busType={smartBusType} />}
          </View>
        )}

        {/* ── CONCESSION ── */}
        {mode === 'concession' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Concession Fares</Text>
            <RouteSearchInput label="Route" value={concRoute} onSelect={r => { setConcRoute(r); setConcResult(null); }} />
            <StopSearchInput
              label="From Stop"
              value={concFrom}
              onSelect={setConcFrom}
              overrideList={concStopList.length > 0 ? concStopList : undefined}
            />
            <StopSearchInput
              label="To Stop"
              value={concTo}
              onSelect={setConcTo}
              overrideList={concStopList.length > 0 ? concStopList : undefined}
            />
            <Text style={styles.sectionLabel}>
              Bus Type{concRouteBusTypes.length > 0 ? ' (assigned to route)' : ''}
            </Text>
            <View style={styles.pillRow}>
              {(concRouteBusTypes.length > 0 ? concRouteBusTypes : BUS_TYPES).map(bt => (
                <TouchableOpacity key={bt} style={[styles.pill, concBusType === bt && styles.pillActive]} onPress={() => setConcBusType(bt)}>
                  <Text style={[styles.pillText, concBusType === bt && styles.pillTextActive]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[styles.btn, { marginTop: 8 }]} onPress={calcConc} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Calculate Fares</Text>}
            </TouchableOpacity>
            {concResult && <ConcessionTicket result={concResult} busType={concBusType} />}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RouteTicket({ result }: { result: FareCalcAllTypesResult }) {
  return (
    <View style={ticket.wrap}>
      <View style={ticket.head}>
        <View>
          <Text style={ticket.org}>Metropolitan Transport Corporation</Text>
          <Text style={ticket.title}>BUS TICKET</Text>
        </View>
        <View style={ticket.routeBadge}><Text style={ticket.routeBadgeText}>{result.routeCode}</Text></View>
      </View>
      <View style={ticket.journey}>
        <View><Text style={ticket.stopLabel}>FROM</Text><Text style={ticket.stopName}>{result.fromStop}</Text></View>
        <Text style={ticket.arrow}>→</Text>
        <View style={{ alignItems: 'flex-end' }}><Text style={ticket.stopLabel}>TO</Text><Text style={ticket.stopName}>{result.toStop}</Text></View>
      </View>
      <View style={ticket.metaRow}>
        <View style={ticket.metaItem}><Text style={ticket.metaLabel}>Stages</Text><Text style={ticket.metaVal}>{result.stages}</Text></View>
        <View style={ticket.metaItem}><Text style={ticket.metaLabel}>Stops</Text><Text style={ticket.metaVal}>{result.totalStops}</Text></View>
        <View style={ticket.metaItem}><Text style={ticket.metaLabel}>Distance</Text><Text style={ticket.metaVal}>{result.distanceKm} km</Text></View>
      </View>
      <View style={ticket.fareRow}>
        {result.fares.map(f => (
          <View key={f.busType} style={ticket.fareItem}>
            <Text style={ticket.fareType}>{f.busType}</Text>
            <Text style={ticket.fareAmt}>{f.fare === 0 ? '—' : `₹${f.fare.toFixed(2)}`}</Text>
          </View>
        ))}
      </View>
      <View style={ticket.foot}>
        <Text style={ticket.footText}>Valid for single journey only</Text>
        <Text style={ticket.footText}>MTC · Chennai</Text>
      </View>
    </View>
  );
}

function SmartTicket({ result, busType }: { result: SmartFareResult; busType: BusType }) {
  return (
    <View style={[ticket.wrap, { backgroundColor: '#1a56db' }]}>
      <View style={ticket.head}>
        <View>
          <Text style={[ticket.org, { color: '#bfdbfe' }]}>Metropolitan Transport Corporation</Text>
          <Text style={[ticket.title, { color: '#fff' }]}>SMART JOURNEY TICKET</Text>
        </View>
        <View style={[ticket.routeBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={ticket.routeBadgeText}>{busType}</Text>
        </View>
      </View>
      <View style={ticket.journey}>
        <View><Text style={[ticket.stopLabel, { color: '#bfdbfe' }]}>FROM</Text><Text style={[ticket.stopName, { color: '#fff' }]}>{result.from}</Text></View>
        <Text style={[ticket.arrow, { color: '#bfdbfe' }]}>→</Text>
        <View style={{ alignItems: 'flex-end' }}><Text style={[ticket.stopLabel, { color: '#bfdbfe' }]}>TO</Text><Text style={[ticket.stopName, { color: '#fff' }]}>{result.to}</Text></View>
      </View>
      <View style={[ticket.metaRow, { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 10 }]}>
        <Text style={[ticket.metaLabel, { color: '#bfdbfe' }]}>Total Fare</Text>
        <Text style={[ticket.fareAmt, { color: '#fff', fontSize: 22 }]}>₹{result.totalFare.toFixed(2)}</Text>
      </View>
      {result.segments.map((seg, i) => (
        <View key={i} style={[ticket.segItem, i > 0 && { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' }]}>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
            <View style={[ticket.routeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Text style={ticket.routeBadgeText}>{seg.routeCode}</Text></View>
            <View style={[ticket.routeBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Text style={ticket.routeBadgeText}>{seg.busType}</Text></View>
          </View>
          <Text style={{ color: '#fff', fontSize: 13 }}>{seg.fromStop} → {seg.toStop}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ color: '#bfdbfe', fontSize: 11 }}>{seg.stages} stages</Text>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{seg.fare === 0 ? '—' : `₹${seg.fare.toFixed(2)}`}</Text>
          </View>
          {i < result.segments.length - 1 && (
            <View style={[ticket.routeBadge, { backgroundColor: '#fef3c7', alignSelf: 'flex-start', marginTop: 6 }]}>
              <Text style={{ color: '#92400e', fontSize: 10, fontWeight: '700' }}>Transfer ↓</Text>
            </View>
          )}
        </View>
      ))}
      <View style={ticket.foot}>
        <Text style={[ticket.footText, { color: '#bfdbfe' }]}>{result.segments.length} segment{result.segments.length > 1 ? 's' : ''}</Text>
        <Text style={[ticket.footText, { color: '#bfdbfe' }]}>MTC · Chennai</Text>
      </View>
    </View>
  );
}

function ConcessionTicket({ result, busType }: { result: FareCalcAllTypesResult; busType: BusType }) {
  const base = result.fares.find(f => f.busType === busType)?.fare ?? 0;
  return (
    <View style={[ticket.wrap, { backgroundColor: '#7c3aed' }]}>
      <View style={ticket.head}>
        <View>
          <Text style={[ticket.org, { color: '#ddd6fe' }]}>Metropolitan Transport Corporation</Text>
          <Text style={[ticket.title, { color: '#fff' }]}>CONCESSION FARE CHART</Text>
        </View>
        <View style={[ticket.routeBadge, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={ticket.routeBadgeText}>{result.routeCode}</Text>
        </View>
      </View>
      <View style={ticket.journey}>
        <View><Text style={[ticket.stopLabel, { color: '#ddd6fe' }]}>FROM</Text><Text style={[ticket.stopName, { color: '#fff' }]}>{result.fromStop}</Text></View>
        <Text style={[ticket.arrow, { color: '#ddd6fe' }]}>→</Text>
        <View style={{ alignItems: 'flex-end' }}><Text style={[ticket.stopLabel, { color: '#ddd6fe' }]}>TO</Text><Text style={[ticket.stopName, { color: '#fff' }]}>{result.toStop}</Text></View>
      </View>
      <View style={ticket.metaRow}>
        <View style={ticket.metaItem}><Text style={[ticket.metaLabel, { color: '#ddd6fe' }]}>Stages</Text><Text style={[ticket.metaVal, { color: '#fff' }]}>{result.stages}</Text></View>
        <View style={ticket.metaItem}><Text style={[ticket.metaLabel, { color: '#ddd6fe' }]}>Stops</Text><Text style={[ticket.metaVal, { color: '#fff' }]}>{result.totalStops}</Text></View>
        <View style={ticket.metaItem}><Text style={[ticket.metaLabel, { color: '#ddd6fe' }]}>Bus Type</Text><Text style={[ticket.metaVal, { color: '#fff' }]}>{busType}</Text></View>
        <View style={ticket.metaItem}><Text style={[ticket.metaLabel, { color: '#ddd6fe' }]}>Base Fare</Text><Text style={[ticket.metaVal, { color: '#a7f3d0' }]}>{base === 0 ? '—' : `₹${base.toFixed(2)}`}</Text></View>
      </View>
      {CONCESSIONS.map(c => {
        const discounted = base === 0 ? 0 : Math.max(0, base * (1 - c.pct / 100));
        return (
          <View key={c.key} style={ticket.concRow}>
            <Text style={ticket.concPassenger}>{c.label}</Text>
            <Text style={ticket.concDiscount}>{c.pct > 0 ? `${c.pct}% off` : 'Full fare'}</Text>
            <Text style={[ticket.concFare, c.pct === 100 && { color: '#a7f3d0' }]}>
              {base === 0 ? '—' : c.pct === 100 ? 'FREE' : `₹${discounted.toFixed(2)}`}
            </Text>
          </View>
        );
      })}
      <View style={ticket.foot}>
        <Text style={[ticket.footText, { color: '#ddd6fe' }]}>Subject to valid ID proof</Text>
        <Text style={[ticket.footText, { color: '#ddd6fe' }]}>MTC · Chennai</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, paddingBottom: 40 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  tabActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  tabTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db' },
  pillActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  criteriaBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 6 },
  criteriaBtnActive: { backgroundColor: '#eff6ff', borderColor: '#1a56db' },
  criteriaLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  criteriaLabelActive: { color: '#1a56db' },
  criteriaDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  criteriaDescActive: { color: '#3b82f6' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

const ticket = StyleSheet.create({
  wrap: { backgroundColor: '#1e3a5f', borderRadius: 14, padding: 16, marginTop: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  org: { fontSize: 10, color: '#93c5fd', marginBottom: 2 },
  title: { fontSize: 14, fontWeight: '800', color: '#fff' },
  routeBadge: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  routeBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  journey: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  stopLabel: { fontSize: 10, color: '#93c5fd', marginBottom: 2 },
  stopName: { fontSize: 13, fontWeight: '700', color: '#fff', maxWidth: 130 },
  arrow: { fontSize: 18, color: '#93c5fd' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  metaItem: { alignItems: 'center' },
  metaLabel: { fontSize: 10, color: '#93c5fd', marginBottom: 2 },
  metaVal: { fontSize: 13, fontWeight: '700', color: '#fff' },
  fareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  fareItem: { flex: 1, minWidth: '40%', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, alignItems: 'center' },
  fareType: { fontSize: 11, color: '#93c5fd', marginBottom: 4 },
  fareAmt: { fontSize: 18, fontWeight: '800', color: '#fff' },
  foot: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10, marginTop: 4 },
  footText: { fontSize: 10, color: '#93c5fd' },
  segItem: { paddingVertical: 10 },
  concRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' },
  concPassenger: { flex: 1, color: '#fff', fontSize: 13 },
  concDiscount: { color: '#ddd6fe', fontSize: 11, marginRight: 12 },
  concFare: { color: '#fff', fontWeight: '800', fontSize: 15, minWidth: 60, textAlign: 'right' },
});
