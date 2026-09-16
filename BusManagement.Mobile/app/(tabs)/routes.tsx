import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { Route, RouteStop, RouteStage, routeDetailApi } from '../../api';

type DetailTab = 'timeline' | 'stops' | 'map';

export default function RoutesScreen() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<Route | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [stages, setStages] = useState<RouteStage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('timeline');
  const isLoadingMoreRef = useRef(false);

  const PAGE_SIZE = 30;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
      setRoutes([]);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async (p: number, s: string, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const r = await routeDetailApi.getAll(p, PAGE_SIZE, s);
      setRoutes(prev => append ? [...prev, ...r.items] : r.items);
      setTotalCount(r.totalCount);
      setTotalPages(r.totalPages ?? Math.ceil(r.totalCount / PAGE_SIZE));
    } catch {}
    finally {
      if (append) setLoadingMore(false); else setLoading(false);
      isLoadingMoreRef.current = false;
    }
  }, []);

  useEffect(() => { load(1, debouncedSearch, false); setPage(1); }, [debouncedSearch]);

  const loadMore = useCallback(() => {
    if (isLoadingMoreRef.current || loadingMore || loading) return;
    if (page >= totalPages) return;
    isLoadingMoreRef.current = true;
    const next = page + 1;
    setPage(next);
    load(next, debouncedSearch, true);
  }, [page, totalPages, loadingMore, loading, debouncedSearch]);

  const openDetail = async (route: Route) => {
    setSelected(route);
    setStops([]); setStages([]); setDetailTab('timeline');
    setDetailLoading(true);
    try {
      const [s, st] = await Promise.all([
        routeDetailApi.getStops(route.routeId),
        routeDetailApi.getStages(route.routeId),
      ]);
      setStops(s); setStages(st);
    } catch {}
    finally { setDetailLoading(false); }
  };

  const stopsWithCoords = stops.filter(s => s.latitude && s.longitude && s.latitude !== 0 && s.longitude !== 0);
  const mapRegion = stopsWithCoords.length > 1 ? (() => {
    const lats = stopsWithCoords.map(s => s.latitude!);
    const lngs = stopsWithCoords.map(s => s.longitude!);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.01),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.01),
    };
  })() : undefined;

  const totalDist = stops.reduce((s, r) => s + (r.distanceFromPreviousKm ?? 0), 0);

  // ── Detail view ──
  if (selected) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.detailTitleWrap}>
            <View style={styles.routeCodeBadge}>
              <Text style={styles.routeCodeBadgeText}>{selected.routeCode}</Text>
            </View>
            <Text style={styles.detailTitle} numberOfLines={1}>{selected.routeName}</Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}><Text style={styles.summaryVal}>{stops.length}</Text><Text style={styles.summaryLabel}>Stops</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryVal}>{stages.length}</Text><Text style={styles.summaryLabel}>Stages</Text></View>
          <View style={styles.summaryItem}><Text style={styles.summaryVal}>{totalDist.toFixed(1)}</Text><Text style={styles.summaryLabel}>km</Text></View>
          <View style={styles.summaryItem}>
            <View style={selected.isActive ? styles.badgeGreen : styles.badgeRed}>
              <Text style={styles.badgeText}>{selected.isActive ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(['timeline', 'stops', 'map'] as DetailTab[]).map(t => (
            <TouchableOpacity key={t} style={[styles.tab, detailTab === t && styles.tabActive]} onPress={() => setDetailTab(t)}>
              <Text style={[styles.tabText, detailTab === t && styles.tabTextActive]}>
                {t === 'timeline' ? 'Timeline' : t === 'stops' ? 'Stop List' : 'Map'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {detailLoading ? (
          <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
        ) : (
          <>
            {detailTab === 'timeline' && (
              <ScrollView contentContainerStyle={styles.timelineContainer}>
                {stops.map((rs, i) => (
                  <View key={rs.routeStopId} style={styles.timelineRow}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, rs.isFirstStop && styles.dotFirst, rs.isLastStop && styles.dotLast]} />
                      {i < stops.length - 1 && <View style={styles.line} />}
                    </View>
                    <View style={styles.timelineContent}>
                      <Text style={styles.timelineStop}>{rs.stopName}</Text>
                      <View style={styles.timelineMeta}>
                        <Text style={styles.timelineCode}>{rs.stopCode}</Text>
                        <Text style={styles.timelineStage}>{rs.stageName}</Text>
                        {rs.isFirstStop && <View style={styles.badgeGreen}><Text style={styles.badgeText}>Origin</Text></View>}
                        {rs.isLastStop && <View style={styles.badgeBlue}><Text style={styles.badgeText}>Terminus</Text></View>}
                      </View>
                    </View>
                    <Text style={styles.timelineOrder}>#{rs.stopOrder}</Text>
                  </View>
                ))}
                {totalDist > 0 && (
                  <Text style={styles.timelineTotal}>
                    Total: {totalDist.toFixed(1)} km · {stops.length} stops · {stages.length} stages
                  </Text>
                )}
              </ScrollView>
            )}

            {detailTab === 'stops' && (
              <FlatList
                data={stops}
                keyExtractor={s => String(s.routeStopId)}
                contentContainerStyle={{ padding: 12 }}
                renderItem={({ item: rs }) => (
                  <View style={styles.stopRow}>
                    <Text style={styles.stopOrder}>{rs.stopOrder}</Text>
                    <View style={styles.stopInfo}>
                      <Text style={styles.stopName}>{rs.stopName}</Text>
                      <Text style={styles.stopMeta}>{rs.stopCode} · {rs.stageName}</Text>
                    </View>
                    <Text style={styles.stopDist}>{rs.isFirstStop ? '—' : `${rs.distanceFromPreviousKm} km`}</Text>
                  </View>
                )}
              />
            )}

            {detailTab === 'map' && (
              stopsWithCoords.length < 2
                ? <View style={styles.center}>
                    <Text style={styles.empty}>No coordinate data for this route.</Text>
                    <Text style={[styles.empty, { fontSize: 11, marginTop: 4 }]}>
                      {stops.length} stops loaded, {stopsWithCoords.length} have coordinates.
                    </Text>
                  </View>
                : <MapView style={styles.map} initialRegion={mapRegion}>
                    <Polyline
                      coordinates={stopsWithCoords.map(s => ({ latitude: s.latitude!, longitude: s.longitude! }))}
                      strokeColor="#dc2626"
                      strokeWidth={3}
                    />
                    {stopsWithCoords.filter(s => s.isFirstStop || s.isLastStop).map(s => (
                      <Marker
                        key={s.routeStopId}
                        coordinate={{ latitude: s.latitude!, longitude: s.longitude! }}
                        title={s.stopName}
                        description={s.isFirstStop ? 'Origin' : 'Terminus'}
                        pinColor={s.isFirstStop ? 'green' : 'red'}
                      />
                    ))}
                  </MapView>
            )}
          </>
        )}
      </SafeAreaView>
    );
  }

  // ── List view ──
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search routes..."
          placeholderTextColor="#9ca3af"
          clearButtonMode="while-editing"
        />

        {loading && routes.length === 0 ? (
          <ActivityIndicator color="#1a56db" style={{ marginTop: 40 }} />
        ) : (
          <>
            <View style={styles.paginationBar}>
              <Text style={styles.countText}>{totalCount} routes</Text>
              <Text style={styles.pageText}>Page {page} of {totalPages}</Text>
            </View>

            <FlatList
              data={routes}
              keyExtractor={r => String(r.routeId)}
              onEndReached={loadMore}
              onEndReachedThreshold={0.4}
              ListFooterComponent={
                loadingMore
                  ? <ActivityIndicator color="#1a56db" style={{ padding: 16 }} />
                  : page >= totalPages && routes.length > 0
                    ? <Text style={styles.endText}>✓ All {totalCount} routes loaded</Text>
                    : null
              }
              ListEmptyComponent={
                <Text style={styles.empty}>No routes found</Text>
              }
              renderItem={({ item: r }) => (
                <TouchableOpacity style={styles.routeCard} onPress={() => openDetail(r)}>
                  <View style={styles.routeCardLeft}>
                    <View style={styles.routeCodeBadge}>
                      <Text style={styles.routeCodeBadgeText}>{r.routeCode}</Text>
                    </View>
                    <View style={styles.routeCardInfo}>
                      <Text style={styles.routeCardName}>{r.routeName}</Text>
                      {(r.startingStop || r.endingStop) && (
                        <Text style={styles.routeCardSub} numberOfLines={1}>
                          {r.startingStop ?? '—'} → {r.endingStop ?? '—'}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={r.isActive ? styles.badgeGreen : styles.badgeRed}>
                    <Text style={styles.badgeText}>{r.isActive ? 'Active' : 'Inactive'}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 12 },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db',
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', marginBottom: 8,
  },
  paginationBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  countText: { fontSize: 12, color: '#6b7280', fontWeight: '600' },
  pageText: { fontSize: 12, color: '#1a56db', fontWeight: '700' },
  endText: { textAlign: 'center', color: '#9ca3af', fontSize: 12, padding: 16 },
  empty: { textAlign: 'center', color: '#9ca3af', fontSize: 14, marginTop: 40 },
  routeCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  routeCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  routeCodeBadge: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  routeCodeBadgeText: { color: '#dc2626', fontWeight: '800', fontSize: 13 },
  routeCardInfo: { flex: 1 },
  routeCardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  routeCardSub: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  backBtn: { paddingVertical: 6, paddingRight: 8 },
  backText: { color: '#1a56db', fontWeight: '600', fontSize: 14 },
  detailTitleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailTitle: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  summaryRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '800', color: '#1a56db' },
  summaryLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#1a56db' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#9ca3af' },
  tabTextActive: { color: '#1a56db' },
  timelineContainer: { padding: 16, paddingBottom: 40 },
  timelineRow: { flexDirection: 'row', marginBottom: 0 },
  timelineLeft: { width: 24, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#f59e0b', marginTop: 4 },
  dotFirst: { backgroundColor: '#16a34a' },
  dotLast: { backgroundColor: '#2563eb' },
  line: { width: 2, flex: 1, backgroundColor: '#e5e7eb', marginVertical: 2 },
  timelineContent: { flex: 1, paddingBottom: 14, paddingLeft: 10 },
  timelineStop: { fontSize: 14, fontWeight: '600', color: '#111827' },
  timelineMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 },
  timelineCode: { fontSize: 11, color: '#6b7280' },
  timelineStage: { fontSize: 11, color: '#9ca3af' },
  timelineOrder: { fontSize: 11, color: '#9ca3af', paddingTop: 4 },
  timelineTotal: { fontSize: 12, color: '#6b7280', textAlign: 'center', marginTop: 8, fontWeight: '600' },
  stopRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, gap: 10 },
  stopOrder: { fontSize: 13, fontWeight: '700', color: '#1a56db', width: 28 },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 13, fontWeight: '600', color: '#111827' },
  stopMeta: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  stopDist: { fontSize: 11, color: '#6b7280' },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  badgeGreen: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeBlue: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeRed: { backgroundColor: '#fee2e2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#374151' },
});
