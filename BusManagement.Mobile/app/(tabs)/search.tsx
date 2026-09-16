import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import { Stop, SearchResult, routesApi } from '../../api';

export default function SearchScreen() {
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async () => {
    if (!from || !to) { Alert.alert('Select both stops'); return; }
    setLoading(true);
    setResult(null);
    try {
      setResult(await routesApi.search(from.stopId, to.stopId));
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <StopSearchInput label="From" value={from} onSelect={setFrom} />
          <StopSearchInput label="To" value={to} onSelect={setTo} />
          <TouchableOpacity style={styles.btn} onPress={search} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Search Routes</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View>
            <Text style={styles.sectionTitle}>
              {result.routes.length} route{result.routes.length !== 1 ? 's' : ''} found
            </Text>
            {result.routes.map(r => (
              <View key={r.routeId} style={styles.routeCard}>
                <View style={styles.routeHeader}>
                  <Text style={styles.routeCode}>{r.routeCode}</Text>
                  <View style={styles.busTypes}>
                    {r.busTypes.map(bt => (
                      <Text key={bt} style={styles.busType}>{bt}</Text>
                    ))}
                  </View>
                </View>
                <Text style={styles.routeName}>{r.routeName}</Text>
                <View style={styles.routeMeta}>
                  <Text style={styles.metaText}>🚏 {r.stops} stops</Text>
                  <Text style={styles.metaText}>📍 {r.distanceKm.toFixed(1)} km</Text>
                  {r.fare != null && <Text style={styles.metaText}>₹ {r.fare}</Text>}
                </View>
              </View>
            ))}
            {result.routes.length === 0 && (
              <Text style={styles.empty}>No direct routes found between these stops.</Text>
            )}
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
  routeCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  routeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  routeCode: { fontSize: 18, fontWeight: '800', color: '#1a56db' },
  busTypes: { flexDirection: 'row', gap: 4 },
  busType: { fontSize: 10, backgroundColor: '#eff6ff', color: '#1d4ed8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: '600' },
  routeName: { fontSize: 13, color: '#374151', marginBottom: 8 },
  routeMeta: { flexDirection: 'row', gap: 14 },
  metaText: { fontSize: 12, color: '#6b7280' },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 20 },
});
