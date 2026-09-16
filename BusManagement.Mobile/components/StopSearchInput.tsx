import React, { useState, useCallback } from 'react';
import {
  View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Stop, stopsApi } from '../api';

interface Props {
  label: string;
  value: Stop | null;
  onSelect: (stop: Stop) => void;
}

export default function StopSearchInput({ label, value, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const search = useCallback(async (text: string) => {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await stopsApi.search(text);
      setResults(data.items);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const select = (stop: Stop) => {
    onSelect(stop);
    setQuery(stop.stopName);
    setResults([]);
    setFocused(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={focused ? query : (value?.stopName ?? '')}
        onChangeText={search}
        onFocus={() => { setFocused(true); setQuery(value?.stopName ?? ''); }}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        placeholder={`Search ${label.toLowerCase()}...`}
        placeholderTextColor="#9ca3af"
      />
      {loading && <ActivityIndicator style={styles.spinner} size="small" color="#1a56db" />}
      {focused && results.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={results}
            keyExtractor={i => String(i.stopId)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => select(item)}>
                <Text style={styles.itemText}>{item.stopName}</Text>
                {item.stopCode ? <Text style={styles.itemCode}>{item.stopCode}</Text> : null}
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12, zIndex: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  spinner: { position: 'absolute', right: 12, top: 30 },
  dropdown: {
    position: 'absolute', top: 68, left: 0, right: 0, zIndex: 99,
    backgroundColor: '#fff', borderRadius: 10, maxHeight: 200,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 6,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  item: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemText: { fontSize: 14, color: '#111827' },
  itemCode: { fontSize: 11, color: '#6b7280', marginTop: 1 },
});
