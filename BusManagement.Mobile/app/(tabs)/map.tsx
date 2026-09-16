import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  TextInput, ScrollView, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Polyline, Marker, MapPressEvent, Region } from 'react-native-maps';
import { CoverageRoute, NearbyStop, coverageApi, stopsApi } from '../../api';

const ROUTE_COLORS = [
  '#6366f1','#06b6d4','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#14b8a6','#f97316','#3b82f6',
  '#a855f7','#22d3ee','#84cc16','#fb923c',
];

export default function MapScreen() {
  const [routes, setRoutes] = useState<CoverageRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoutes, setSelectedRoutes] = useState<Set<number>>(new Set());
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [clickCoords, setClickCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState(1);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [nearbyOpen, setNearbyOpen] = useState(false);

  const CHENNAI_REGION: Region = {
    latitude: 13.0827, longitude: 80.2707,
    latitudeDelta: 0.3, longitudeDelta: 0.3,
  };

  useEffect(() => {
    coverageApi.getAll()
      .then(data => {
        setRoutes(data);
        setSelectedRoutes(new Set(data.map(r => r.routeId)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleMapPress = async (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setClickCoords({ lat: latitude, lng: longitude });
    setNearbyOpen(true);
    setNearbyLoading(true);
    setNearbyStops([]);
    try {
      const stops = await stopsApi.getNearby(latitude, longitude, radius);
      setNearbyStops(stops);
    } catch {}
    finally { setNearbyLoading(false); }
  };

  const toggleRoute = (id: number) =>
    setSelectedRoutes(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAll = () =>
    setSelectedRoutes(prev => prev.size === routes.length ? new Set() : new Set(routes.map(r => r.routeId)));

  const filteredRoutes = routes.filter(r =>
    !search || r.routeCode.toLowerCase().includes(search.toLowerCase()) ||
    r.routeName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#1a56db" />
      <Text style={styles.loadingText}>Loading coverage data…</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={CHENNAI_REGION}
        onPress={handleMapPress}
      >
        {routes.map((route, idx) => {
          if (!selectedRoutes.has(route.routeId)) return null;
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          const coords = route.stops
            .filter(s => s.latitude && s.longitude)
            .map(s => ({ latitude: s.latitude, longitude: s.longitude }));
          if (coords.length < 2) return null;
          return (
            <Polyline
              key={route.routeId}
              coordinates={coords}
              strokeColor={color}
              strokeWidth={3}
            />
          );
        })}

        {routes.map((route, idx) => {
          if (!selectedRoutes.has(route.routeId)) return null;
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];
          return route.stops
            .filter(s => (s.isFirstStop || s.isLastStop) && s.latitude && s.longitude)
            .map(s => (
              <Marker
                key={`${route.routeId}-${s.stopOrder}`}
                coordinate={{ latitude: s.latitude, longitude: s.longitude }}
                title={s.stopName}
                description={`${route.routeCode} · ${s.isFirstStop ? 'Origin' : 'Terminus'}`}
                pinColor={color}
              />
            ));
        })}

        {/* Nearby stop markers */}
        {nearbyStops.map(s => s.latitude && s.longitude ? (
          <Marker
            key={`nearby-${s.stopId}`}
            coordinate={{ latitude: s.latitude!, longitude: s.longitude! }}
            title={s.stopName}
            description={`${s.distanceKm} km away`}
            pinColor="orange"
          />
        ) : null)}

        {/* Click point marker */}
        {clickCoords && (
          <Marker
            coordinate={{ latitude: clickCoords.lat, longitude: clickCoords.lng }}
            title="Search point"
            pinColor="gold"
          />
        )}
      </MapView>

      {/* Stats bar */}
      <SafeAreaView edges={['top']} style={styles.statsBar}>
        <View style={styles.statsInner}>
          <View style={styles.stat}><Text style={styles.statVal}>{routes.length}</Text><Text style={styles.statLabel}>Routes</Text></View>
          <View style={styles.statDiv} />
          <View style={styles.stat}><Text style={[styles.statVal, { color: '#06b6d4' }]}>{selectedRoutes.size}</Text><Text style={styles.statLabel}>Visible</Text></View>
          <View style={styles.statDiv} />
          <View style={styles.stat}><Text style={[styles.statVal, { color: '#f59e0b' }]}>{nearbyStops.length}</Text><Text style={styles.statLabel}>Nearby</Text></View>
          <TouchableOpacity style={styles.drawerToggle} onPress={() => setDrawerOpen(v => !v)}>
            <Text style={styles.drawerToggleText}>{drawerOpen ? '✕' : '☰'} Routes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Routes drawer */}
      {drawerOpen && (
        <View style={styles.drawer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Routes ({selectedRoutes.size}/{routes.length})</Text>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.toggleAllText}>{selectedRoutes.size === routes.length ? 'Hide all' : 'Show all'}</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.drawerSearch}
            value={search}
            onChangeText={setSearch}
            placeholder="Search routes..."
            placeholderTextColor="#9ca3af"
          />
          <View style={styles.radiusRow}>
            <Text style={styles.radiusLabel}>Nearby radius: {radius} km</Text>
            <View style={styles.radiusBtns}>
              {[0.5, 1, 2, 3].map(r => (
                <TouchableOpacity key={r} style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]} onPress={() => setRadius(r)}>
                  <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <FlatList
            data={filteredRoutes}
            keyExtractor={r => String(r.routeId)}
            style={styles.routeList}
            renderItem={({ item: r, index }) => {
              const color = ROUTE_COLORS[routes.indexOf(r) % ROUTE_COLORS.length];
              const active = selectedRoutes.has(r.routeId);
              return (
                <TouchableOpacity style={styles.routeItem} onPress={() => toggleRoute(r.routeId)}>
                  <View style={[styles.routeDot, { backgroundColor: active ? color : '#d1d5db' }]} />
                  <Text style={[styles.routeItemCode, { color: active ? color : '#9ca3af' }]}>{r.routeCode}</Text>
                  <Text style={styles.routeItemStops}>{r.stops.length}</Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Nearby panel */}
      {nearbyOpen && (
        <View style={styles.nearbyPanel}>
          <View style={styles.nearbyHeader}>
            <View>
              <Text style={styles.nearbyTitle}>Nearby Stops</Text>
              {clickCoords && (
                <Text style={styles.nearbyCoords}>
                  {clickCoords.lat.toFixed(4)}, {clickCoords.lng.toFixed(4)} · {radius} km
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={() => { setNearbyOpen(false); setNearbyStops([]); setClickCoords(null); }}>
              <Text style={styles.nearbyClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {nearbyLoading ? (
            <ActivityIndicator color="#1a56db" style={{ padding: 16 }} />
          ) : nearbyStops.length === 0 ? (
            <Text style={styles.nearbyEmpty}>No stops within {radius} km</Text>
          ) : (
            <FlatList
              data={nearbyStops}
              keyExtractor={s => String(s.stopId)}
              style={styles.nearbyList}
              renderItem={({ item: s, index }) => (
                <View style={styles.nearbyItem}>
                  <Text style={styles.nearbyRank}>{index + 1}</Text>
                  <View style={styles.nearbyInfo}>
                    <Text style={styles.nearbyName}>{s.stopName}</Text>
                    <Text style={styles.nearbyCode}>{s.stopCode}</Text>
                  </View>
                  <Text style={styles.nearbyDist}>{s.distanceKm} km</Text>
                </View>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#6b7280', fontSize: 14 },
  statsBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  statsInner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(17,24,39,0.85)', marginHorizontal: 12, marginTop: 8,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, gap: 12,
  },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, color: '#9ca3af' },
  statDiv: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.15)' },
  drawerToggle: { marginLeft: 'auto', backgroundColor: '#1a56db', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  drawerToggleText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  drawer: {
    position: 'absolute', top: 80, left: 12, width: 220,
    backgroundColor: 'rgba(17,24,39,0.92)', borderRadius: 14,
    maxHeight: 420, overflow: 'hidden',
  },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12 },
  drawerTitle: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toggleAllText: { color: '#06b6d4', fontSize: 11, fontWeight: '600' },
  drawerSearch: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, marginHorizontal: 10,
    paddingHorizontal: 10, paddingVertical: 7, fontSize: 13, color: '#fff', marginBottom: 8,
  },
  radiusRow: { paddingHorizontal: 10, marginBottom: 8 },
  radiusLabel: { color: '#9ca3af', fontSize: 11, marginBottom: 4 },
  radiusBtns: { flexDirection: 'row', gap: 6 },
  radiusBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  radiusBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  radiusBtnText: { color: '#9ca3af', fontSize: 11, fontWeight: '600' },
  radiusBtnTextActive: { color: '#fff' },
  routeList: { maxHeight: 240 },
  routeItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, gap: 8 },
  routeDot: { width: 8, height: 8, borderRadius: 4 },
  routeItemCode: { flex: 1, fontSize: 12, fontWeight: '700' },
  routeItemStops: { fontSize: 10, color: '#6b7280' },
  nearbyPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(17,24,39,0.95)', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: 300,
  },
  nearbyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14 },
  nearbyTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
  nearbyCoords: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  nearbyClose: { color: '#9ca3af', fontSize: 18, padding: 4 },
  nearbyEmpty: { color: '#9ca3af', textAlign: 'center', padding: 16 },
  nearbyList: { maxHeight: 220 },
  nearbyItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', gap: 10 },
  nearbyRank: { color: '#6b7280', fontSize: 12, width: 20, textAlign: 'center' },
  nearbyInfo: { flex: 1 },
  nearbyName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  nearbyCode: { color: '#6b7280', fontSize: 11, marginTop: 1 },
  nearbyDist: { color: '#f59e0b', fontWeight: '700', fontSize: 13 },
});
