import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import {
  Stop, SearchResult, SmartSearchResult, Criteria, CRITERIA,
  routesApi,
} from '../../api';

type Mode = 'direct' | 'smart';

const BUS_TYPE_COLORS: Record<string, string> = {
  Ordinary: '#888', Express: '#4caf50', Deluxe: '#2196f3', AC: '#f44336',
};

export default function SearchScreen() {
  const [mode, setMode] = useState<Mode>('direct');
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [criteria, setCriteria] = useState<Criteria>('ShortestDistance');
  const [directResult, setDirectResult] = useState<SearchResult | null>(null);
  const [smartResult, setSmartResult] = useState<SmartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (m: Mode) => {
    setMode(m); setDirectResult(null); setSmartResult(null);
  };

  const swap = () => { const t = from; setFrom(to); setTo(t); setDirectResult(null); setSmartResult(null); };
  const clear = () => { setFrom(null); setTo(null); setDirectResult(null); setSmartResult(null); };

  const search = async () => {
    if (!from || !to) { Alert.alert('Select both stops'); return; }
    setLoading(true); setDirectResult(null); setSmartResult(null);
    try {
      if (mode === 'direct') setDirectResult(await routesApi.search(from.stopId, to.stopId));
      else setSmartResult(await routesApi.smartSearch(from.stopId, to.stopId, criteria));
    } catch (e: any) {
      const msg = e.message?.includes('404') ? 'No route found between these stops.' : 'Search failed.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  const trySmart = async () => {
    if (!from || !to) return;
    setMode('smart'); setDirectResult(null); setLoading(true);
    try { setSmartResult(await routesApi.smartSearch(from.stopId, to.stopId, criteria)); }
    catch { Alert.alert('No route found between these stops.'); }
    finally { setLoading(false); }
  };

  const hasResult = !!(directResult || smartResult);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity style={[styles.modeBtn, mode === 'direct' && styles.modeBtnActive]} onPress={() => switchMode('direct')}>
            <Text style={[styles.modeBtnText, mode === 'direct' && styles.modeBtnTextActive]}>→ Direct Search</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.modeBtn, mode === 'smart' && styles.modeBtnActive]} onPress={() => switchMode('smart')}>
            <Text style={[styles.modeBtnText, mode === 'smart' && styles.modeBtnTextActive]}>✦ Smart Journey</Text>
          </TouchableOpacity>
        </View>

        {/* Inputs */}
        <View style={styles.card}>
          <StopSearchInput label="From" value={from} onSelect={setFrom} />
          <TouchableOpacity style={styles.swapBtn} onPress={swap}>
            <Text style={styles.swapText}>⇅ Swap</Text>
          </TouchableOpacity>
          <StopSearchInput label="To" value={to} onSelect={setTo} />

          {mode === 'smart' && (
            <View style={styles.criteriaSection}>
              <Text style={styles.sectionLabel}>Route Criteria</Text>
              {CRITERIA.map(c => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.criteriaBtn, criteria === c.value && styles.criteriaBtnActive]}
                  onPress={() => setCriteria(c.value)}
                >
                  <Text style={[styles.criteriaLabel, criteria === c.value && styles.criteriaLabelActive]}>{c.label}</Text>
                  <Text style={[styles.criteriaDesc, criteria === c.value && styles.criteriaDescActive]}>{c.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.btn} onPress={search} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Search Routes</Text>}
            </TouchableOpacity>
            {hasResult && (
              <TouchableOpacity style={styles.clearBtn} onPress={clear}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Direct Result */}
        {directResult && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Direct Routes</Text>
              <View style={styles.badgeGreen}><Text style={styles.badgeText}>Direct</Text></View>
            </View>
            <Text style={styles.subTitle}>{directResult.fromStop} → {directResult.toStop} · {directResult.routes.length} route{directResult.routes.length !== 1 ? 's' : ''} found</Text>

            {directResult.routes.length === 0 ? (
              <View style={styles.noResult}>
                <Text style={styles.noResultText}>No direct routes found between these stops.</Text>
                <TouchableOpacity style={[styles.btn, { marginTop: 10 }]} onPress={trySmart} disabled={loading}>
                  <Text style={styles.btnText}>✦ Try Smart Journey</Text>
                </TouchableOpacity>
              </View>
            ) : (
              directResult.routes.map(r => (
                <View key={r.routeId} style={styles.routeItem}>
                  <View style={styles.routeLeft}>
                    <Text style={styles.routeCode}>{r.routeCode}</Text>
                    <Text style={styles.routeName}>{r.routeName}</Text>
                    <View style={styles.pillRow}>
                      {r.busTypes.map(bt => (
                        <View key={bt} style={[styles.pill, { borderColor: BUS_TYPE_COLORS[bt] }]}>
                          <Text style={[styles.pillText, { color: BUS_TYPE_COLORS[bt] }]}>{bt.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.routeRight}>
                    <View style={styles.stat}><Text style={styles.statVal}>{r.stops}</Text><Text style={styles.statLabel}>stops</Text></View>
                    {r.distanceKm != null && <View style={styles.stat}><Text style={styles.statVal}>{r.distanceKm}</Text><Text style={styles.statLabel}>km</Text></View>}
                    <View style={styles.badgeGreen}><Text style={styles.badgeText}>0 transfers</Text></View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* Smart Result */}
        {smartResult && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {smartResult.transfers === 0 ? 'Direct Route Found' : `Journey with ${smartResult.transfers} Transfer${smartResult.transfers > 1 ? 's' : ''}`}
              </Text>
              <View style={smartResult.transfers === 0 ? styles.badgeGreen : styles.badgeAmber}>
                <Text style={styles.badgeText}>{smartResult.transfers === 0 ? 'Direct' : `${smartResult.transfers} transfer${smartResult.transfers > 1 ? 's' : ''}`}</Text>
              </View>
            </View>
            <Text style={styles.subTitle}>{smartResult.from} → {smartResult.to}</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{smartResult.totalDistanceKm}</Text><Text style={styles.summaryLabel}>km</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{smartResult.totalStops}</Text><Text style={styles.summaryLabel}>stops</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{smartResult.transfers}</Text><Text style={styles.summaryLabel}>transfers</Text></View>
            </View>

            {smartResult.segments.map((seg, i) => (
              <View key={i} style={styles.routeItem}>
                <View style={styles.routeLeft}>
                  <Text style={styles.routeCode}>{seg.routeCode}</Text>
                  <View style={styles.pathRow}>
                    <Text style={styles.pathStop}>{seg.fromStop}</Text>
                    <Text style={styles.pathArrow}> → </Text>
                    <Text style={styles.pathStop}>{seg.toStop}</Text>
                  </View>
                </View>
                <View style={styles.routeRight}>
                  <View style={styles.stat}><Text style={styles.statVal}>{seg.stops}</Text><Text style={styles.statLabel}>stops</Text></View>
                  <View style={styles.stat}><Text style={styles.statVal}>{seg.distanceKm}</Text><Text style={styles.statLabel}>km</Text></View>
                  {i < smartResult.segments.length - 1 && <View style={styles.badgeAmber}><Text style={styles.badgeText}>Transfer</Text></View>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, paddingBottom: 40 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center', backgroundColor: '#fff' },
  modeBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  modeBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  modeBtnTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  swapBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  swapText: { fontSize: 13, color: '#1a56db', fontWeight: '600' },
  criteriaSection: { marginTop: 4, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  criteriaBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 6 },
  criteriaBtnActive: { backgroundColor: '#eff6ff', borderColor: '#1a56db' },
  criteriaLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  criteriaLabelActive: { color: '#1a56db' },
  criteriaDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  criteriaDescActive: { color: '#3b82f6' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  clearBtnText: { color: '#374151', fontWeight: '600' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  badgeGreen: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAmber: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  noResult: { alignItems: 'center', paddingVertical: 10 },
  noResultText: { color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  routeItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  routeLeft: { flex: 1, marginRight: 8 },
  routeCode: { fontSize: 17, fontWeight: '800', color: '#1a56db', marginBottom: 2 },
  routeName: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  pill: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pillText: { fontSize: 10, fontWeight: '700' },
  routeRight: { alignItems: 'flex-end', gap: 4 },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9ca3af' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '800', color: '#1a56db' },
  summaryLabel: { fontSize: 11, color: '#6b7280' },
  pathRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', marginTop: 2 },
  pathStop: { fontSize: 13, color: '#111827', fontWeight: '500' },
  pathArrow: { fontSize: 13, color: '#9ca3af' },
});
