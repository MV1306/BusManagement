import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StopSearchInput from '../../components/StopSearchInput';
import { Stop, JourneyPlanResult, BusType, BUS_TYPES, Criteria, CRITERIA, journeyApi } from '../../api';

export default function JourneyScreen() {
  const [from, setFrom] = useState<Stop | null>(null);
  const [to, setTo] = useState<Stop | null>(null);
  const [busType, setBusType] = useState<BusType>('Ordinary');
  const [criteria, setCriteria] = useState<Criteria>('ShortestDistance');
  const [result, setResult] = useState<JourneyPlanResult | null>(null);
  const [loading, setLoading] = useState(false);

  const swap = () => { const t = from; setFrom(to); setTo(t); setResult(null); };
  const clear = () => { setFrom(null); setTo(null); setResult(null); };

  const plan = async () => {
    if (!from || !to) { Alert.alert('Select both stops'); return; }
    setLoading(true); setResult(null);
    try {
      setResult(await journeyApi.plan(from.stopId, to.stopId, busType, criteria));
    } catch (e: any) {
      const msg = e.message?.includes('404') ? 'No route found between these stops.' : 'Journey planning failed.';
      Alert.alert('Error', msg);
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Journey Planner</Text>
            <View style={styles.badgeBlue}><Text style={styles.badgeText}>Route + Fare</Text></View>
          </View>

          <StopSearchInput label="From" value={from} onSelect={setFrom} />
          <TouchableOpacity style={styles.swapBtn} onPress={swap}>
            <Text style={styles.swapText}>⇅ Swap</Text>
          </TouchableOpacity>
          <StopSearchInput label="To" value={to} onSelect={setTo} />

          <Text style={styles.sectionLabel}>Bus Type</Text>
          <View style={styles.pillRow}>
            {BUS_TYPES.map(bt => (
              <TouchableOpacity key={bt} style={[styles.pill, busType === bt && styles.pillActive]} onPress={() => setBusType(bt)}>
                <Text style={[styles.pillText, busType === bt && styles.pillTextActive]}>{bt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Route Criteria</Text>
          {CRITERIA.map(c => (
            <TouchableOpacity key={c.value} style={[styles.criteriaBtn, criteria === c.value && styles.criteriaBtnActive]} onPress={() => setCriteria(c.value)}>
              <Text style={[styles.criteriaLabel, criteria === c.value && styles.criteriaLabelActive]}>{c.label}</Text>
              <Text style={[styles.criteriaDesc, criteria === c.value && styles.criteriaDescActive]}>{c.desc}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.btn} onPress={plan} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Plan Journey</Text>}
            </TouchableOpacity>
            {result && (
              <TouchableOpacity style={styles.clearBtn} onPress={clear}>
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {result && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>
                {result.transfers === 0 ? 'Direct Journey' : `Journey with ${result.transfers} Transfer${result.transfers > 1 ? 's' : ''}`}
              </Text>
              <View style={result.transfers === 0 ? styles.badgeGreen : styles.badgeAmber}>
                <Text style={styles.badgeText}>{result.transfers === 0 ? 'Direct' : `${result.transfers} transfer${result.transfers > 1 ? 's' : ''}`}</Text>
              </View>
            </View>
            <Text style={styles.subTitle}>{result.from} → {result.to} · {result.busType}</Text>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>₹{result.totalFare.toFixed(2)}</Text><Text style={styles.summaryLabel}>Total Fare</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{result.totalDistanceKm}</Text><Text style={styles.summaryLabel}>km</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{result.totalStops}</Text><Text style={styles.summaryLabel}>stops</Text></View>
              <View style={styles.summaryItem}><Text style={styles.summaryVal}>{result.transfers}</Text><Text style={styles.summaryLabel}>transfers</Text></View>
            </View>

            {result.legs.map((leg, i) => (
              <View key={i} style={styles.legItem}>
                <View style={styles.legLeft}>
                  <Text style={styles.legCode}>{leg.routeCode}</Text>
                  <View style={styles.pathRow}>
                    <Text style={styles.pathStop}>{leg.boardAt}</Text>
                    <Text style={styles.pathArrow}> → </Text>
                    <Text style={styles.pathStop}>{leg.alightAt}</Text>
                  </View>
                  <Text style={styles.legName}>{leg.routeName}</Text>
                </View>
                <View style={styles.legRight}>
                  <View style={styles.stat}><Text style={styles.statVal}>{leg.stops}</Text><Text style={styles.statLabel}>stops</Text></View>
                  <View style={styles.stat}><Text style={styles.statVal}>{leg.distanceKm}</Text><Text style={styles.statLabel}>km</Text></View>
                  <View style={styles.stat}><Text style={styles.statVal}>{leg.stages}</Text><Text style={styles.statLabel}>stages</Text></View>
                  <View style={styles.badgeGreen}><Text style={styles.badgeText}>₹{leg.fare.toFixed(2)}</Text></View>
                  {i < result.legs.length - 1 && <View style={styles.badgeAmber}><Text style={styles.badgeText}>Transfer</Text></View>}
                </View>
              </View>
            ))}

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Fare</Text>
              <Text style={styles.totalVal}>₹{result.totalFare.toFixed(2)}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subTitle: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  swapBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  swapText: { fontSize: 13, color: '#1a56db', fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 4 },
  pillRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  pill: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  pillActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  pillText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  pillTextActive: { color: '#fff' },
  criteriaBtn: { padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', marginBottom: 6 },
  criteriaBtnActive: { backgroundColor: '#eff6ff', borderColor: '#1a56db' },
  criteriaLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  criteriaLabelActive: { color: '#1a56db' },
  criteriaDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  criteriaDescActive: { color: '#3b82f6' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { flex: 1, backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  clearBtn: { paddingHorizontal: 16, paddingVertical: 13, borderRadius: 10, borderWidth: 1, borderColor: '#d1d5db' },
  clearBtnText: { color: '#374151', fontWeight: '600' },
  badgeBlue: { backgroundColor: '#dbeafe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: '#dcfce7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeAmber: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#374151' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 12 },
  summaryItem: { alignItems: 'center' },
  summaryVal: { fontSize: 16, fontWeight: '800', color: '#1a56db' },
  summaryLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  legItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  legLeft: { flex: 1, marginRight: 8 },
  legCode: { fontSize: 16, fontWeight: '800', color: '#1a56db', marginBottom: 2 },
  legName: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  legRight: { alignItems: 'flex-end', gap: 4 },
  pathRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  pathStop: { fontSize: 13, color: '#111827', fontWeight: '500' },
  pathArrow: { fontSize: 13, color: '#9ca3af' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 13, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 10, color: '#9ca3af' },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f3f4f6', marginTop: 4, gap: 8 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  totalVal: { fontSize: 18, fontWeight: '800', color: '#1a56db' },
});
