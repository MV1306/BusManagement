import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { NearbyStop, stopsApi } from '../../api';

export default function NearbyScreen() {
  const [stops, setStops] = useState<NearbyStop[]>([]);
  const [loading, setLoading] = useState(false);
  const [radius, setRadius] = useState(1);

  const findNearby = async (r: number) => {
    setLoading(true);
    setStops([]);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Location permission denied'); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const data = await stopsApi.getNearby(loc.coords.latitude, loc.coords.longitude, r);
      setStops(data);
      if (data.length === 0) Alert.alert('No stops found', `No stops within ${r} km.`);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.label}>Search Radius</Text>
          <View style={styles.radiusRow}>
            {[0.5, 1, 2, 3].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, radius === r && styles.radiusBtnActive]}
                onPress={() => setRadius(r)}
              >
                <Text style={[styles.radiusBtnText, radius === r && styles.radiusBtnTextActive]}>
                  {r} km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.btn} onPress={() => findNearby(radius)} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>📍 Find Nearby Stops</Text>}
          </TouchableOpacity>
        </View>

        {stops.length > 0 && (
          <Text style={styles.count}>{stops.length} stops within {radius} km</Text>
        )}

        <FlatList
          data={stops}
          keyExtractor={s => String(s.stopId)}
          renderItem={({ item }) => (
            <View style={styles.stopCard}>
              <View style={styles.stopRow}>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{item.stopName}</Text>
                  {item.stopCode ? <Text style={styles.stopCode}>{item.stopCode}</Text> : null}
                </View>
                <View style={styles.distBadge}>
                  <Text style={styles.distText}>{item.distanceKm.toFixed(2)} km</Text>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  radiusRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  radiusBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', alignItems: 'center' },
  radiusBtnActive: { backgroundColor: '#1a56db', borderColor: '#1a56db' },
  radiusBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  radiusBtnTextActive: { color: '#fff' },
  btn: { backgroundColor: '#1a56db', borderRadius: 10, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  count: { fontSize: 12, color: '#6b7280', marginBottom: 8, fontWeight: '600' },
  stopCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4 },
  stopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  stopCode: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  distBadge: { backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  distText: { fontSize: 12, color: '#1d4ed8', fontWeight: '700' },
});
