import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import { Stop, FareCalcAllTypesResult, SearchResult, faresApi, routesApi } from '../../api';

export default function FaresScreen() {
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [routes, setRoutes] = useState<SearchResult['routes']>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [result, setResult] = useState<FareCalcAllTypesResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'stops' | 'route' | 'fares'>('stops');

  const findRoutes = async () => {
    if (!from || !to) { Alert.alert('Select both stops'); return; }
    setLoading(true);
    setRoutes([]);
    setResult(null);
    setStep('stops');
    try {
      const data = await routesApi.search(from.stopId, to.stopId);
      setRoutes(data.routes);
      setStep('route');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const calcFares = async (routeId: number) => {
    setSelectedRouteId(routeId);
    setLoading(true);
    setResult(null);
    try {
      setResult(await faresApi.calculateAllTypes(routeId, from!.stopId, to!.stopId));
      setStep('fares');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const busTypeColor: Record<string, string> = {
    Ordinary: '#6b7280', Express: '#d97706', Deluxe: '#7c3aed', AC: '#0891b2',
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <StopSearchInput label="From" value={from} onSelect={s => { setFrom(s); setRoutes([]); setResult(null); setStep('stops'); }} />
          <StopSearchInput label="To" value={to} onSelect={s => { setTo(s); setRoutes([]); setResult(null); setStep('stops'); }} />
          <TouchableOpacity style={styles.btn} onPress={findRoutes} disabled={loading}>
            {loading && step === 'stops'
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Find Routes</Text>}
          </TouchableOpacity>
        </View>

        {step === 'route' && routes.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Select a route to see fares</Text>
            {routes.map(r => (
              <TouchableOpacity key={r.routeId} style={styles.routeCard} onPress={() => calcFares(r.routeId)}>
                <Text style={styles.routeCode}>{r.routeCode}</Text>
                <Text style={styles.routeName}>{r.routeName}</Text>
                <Text style={styles.routeMeta}>{r.stops} stops · {r.distanceKm.toFixed(1)} km</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {step === 'route' && routes.length === 0 && !loading && (
          <Text style={styles.empty}>No routes found between these stops.</Text>
        )}

        {loading && step === 'route' && <ActivityIndicator color="#1a56db" style={{ marginTop: 20 }} />}

        {result && step === 'fares' && (
          <View>
            <View style={styles.fareHeader}>
              <Text style={styles.fareRoute}>{result.routeCode}</Text>
              <Text style={styles.fareStops}>{result.fromStop} → {result.toStop}</Text>
              <Text style={styles.fareMeta}>{result.totalStops} stops · {result.distanceKm.toFixed(1)} km · {result.stages} stages</Text>
            </View>
            {result.fares.map(f => (
              <View key={f.busType} style={styles.fareRow}>
                <View style={[styles.busTypeDot, { backgroundColor: busTypeColor[f.busType] ?? '#6b7280' }]} />
                <Text style={styles.fareType}>{f.busType}</Text>
                <Text style={styles.fareAmount}>₹{f.fare}</Text>
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
  container: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', marginBottom: 10 },
  routeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  routeCode: { fontSize: 17, fontWeight: '800', color: '#1a56db' },
  routeName: { fontSize: 12, color: '#374151', marginTop: 2 },
  routeMeta: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
  fareHeader: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  fareRoute: { fontSize: 20, fontWeight: '800', color: '#1a56db' },
  fareStops: { fontSize: 13, color: '#374151', marginTop: 4 },
  fareMeta: { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  fareRow: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, flexDirection: 'row', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  busTypeDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  fareType: { flex: 1, fontSize: 15, fontWeight: '600', color: '#374151' },
  fareAmount: { fontSize: 20, fontWeight: '800', color: '#059669' },
});
