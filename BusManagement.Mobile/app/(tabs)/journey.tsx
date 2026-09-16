import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import { Stop, JourneyPlanResult, BusType, BUS_TYPES, journeyApi } from '../../api';

export default function JourneyScreen() {
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [busType, setBusType] = useState<BusType>('Ordinary');
  const [result, setResult] = useState<JourneyPlanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const plan = async () => {
    if (!from || !to) { Alert.alert('Select both stops'); return; }
    setLoading(true);
    setResult(null);
    try {
      setResult(await journeyApi.plan(from.stopId, to.stopId, busType));
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

          <Text style={styles.label}>Bus Type</Text>
          <View style={styles.busTypeRow}>
            {BUS_TYPES.map(bt => (
              <TouchableOpacity
                key={bt}
                style={[styles.busTypeBtn, busType === bt && styles.busTypeBtnActive]}
                onPress={() => setBusType(bt)}
              >
                <Text style={[styles.busTypeBtnText, busType === bt && styles.busTypeBtnTextActive]}>
                  {bt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.btn} onPress={plan} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Plan Journey</Text>}
          </TouchableOpacity>
        </View>

        {result && (
          <View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{result.from} → {result.to}</Text>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>₹{result.totalFare}</Text>
                  <Text style={styles.summaryLabel}>Total Fare</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{result.totalDistanceKm.toFixed(1)} km</Text>
                  <Text style={styles.summaryLabel}>Distance</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{result.transfers}</Text>
                  <Text style={styles.summaryLabel}>Transfers</Text>
                </View>
              </View>
            </View>

            {result.legs.map((leg, i) => (
              <View key={i} style={styles.legCard}>
                <View style={styles.legHeader}>
                  <Text style={styles.legRoute}>{leg.routeCode}</Text>
                  <Text style={styles.legFare}>₹{leg.fare}</Text>
                </View>
                <Text style={styles.legName}>{leg.routeName}</Text>
                <View style={styles.legStops}>
                  <View style={styles.dot} />
                  <Text style={styles.legStop}>{leg.boardAt}</Text>
                </View>
                <View style={styles.legLine} />
                <View style={styles.legStops}>
                  <View style={[styles.dot, styles.dotEnd]} />
                  <Text style={styles.legStop}>{leg.alightAt}</Text>
                </View>
                <Text style={styles.legMeta}>{leg.stops} stops · {leg.distanceKm.toFixed(1)} km · {leg.stages} stages</Text>
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
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  busTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  busTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  busTypeBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  busTypeBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  busTypeBtnTextActive: { color: '#fff' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  summaryCard: { backgroundColor: '#1a56db', borderRadius: 14, padding: 16, marginBottom: 12 },
  summaryTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center' },
  summaryValue: { color: '#fff', fontSize: 20, fontWeight: '800' },
  summaryLabel: { color: '#bfdbfe', fontSize: 11, marginTop: 2 },
  legCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  legHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  legRoute: { fontSize: 16, fontWeight: '800', color: '#1a56db' },
  legFare: { fontSize: 16, fontWeight: '700', color: '#059669' },
  legName: { fontSize: 12, color: '#6b7280', marginBottom: 10 },
  legStops: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#1a56db' },
  dotEnd: { backgroundColor: '#dc2626' },
  legLine: { width: 2, height: 16, backgroundColor: '#d1d5db', marginLeft: 4, marginVertical: 2 },
  legStop: { fontSize: 13, color: '#111827', fontWeight: '500' },
  legMeta: { fontSize: 11, color: '#9ca3af', marginTop: 8 },
});
