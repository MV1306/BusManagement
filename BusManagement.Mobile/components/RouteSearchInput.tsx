import React, { useState, useCallback, useRef } from 'react';
import {
  View, TextInput, Modal, Text, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, TouchableWithoutFeedback,
} from 'react-native';
import { Route, routesApi } from '../api';

interface Props {
  label: string;
  value: Route | null;
  onSelect: (route: Route) => void;
}

export default function RouteSearchInput({ label, value, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Route[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownY, setDropdownY] = useState(0);
  const [dropdownX, setDropdownX] = useState(0);
  const [dropdownW, setDropdownW] = useState(0);
  const inputRef = useRef<View>(null);

  const search = useCallback(async (text: string) => {
    setQuery(text);
    if (text.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await routesApi.searchAll(text);
      setResults(data.items);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const openDropdown = () => {
    inputRef.current?.measure((_fx, _fy, w, h, px, py) => {
      setDropdownX(px); setDropdownY(py + h); setDropdownW(w);
    });
    setQuery(value ? `${value.routeCode} — ${value.routeName}` : '');
    setOpen(true);
  };

  const select = (route: Route) => {
    onSelect(route); setResults([]); setOpen(false); setQuery('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View ref={inputRef} collapsable={false}>
        <TouchableOpacity onPress={openDropdown} activeOpacity={1}>
          <View pointerEvents="none">
            <TextInput
              style={styles.input}
              value={value ? `${value.routeCode} — ${value.routeName}` : ''}
              placeholder="Search route..."
              placeholderTextColor="#9ca3af"
              editable={false}
            />
          </View>
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={StyleSheet.absoluteFill}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { top: dropdownY, left: dropdownX, width: dropdownW }]}>
                <View style={styles.searchRow}>
                  <TextInput
                    style={styles.modalInput}
                    value={query}
                    onChangeText={search}
                    placeholder="Search route..."
                    placeholderTextColor="#9ca3af"
                    autoFocus
                  />
                  {loading && <ActivityIndicator size="small" color="#1a56db" style={{ marginRight: 8 }} />}
                </View>
                <FlatList
                  data={results}
                  keyExtractor={i => String(i.routeId)}
                  keyboardShouldPersistTaps="handled"
                  style={styles.list}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.item} onPress={() => select(item)}>
                      <Text style={styles.itemCode}>{item.routeCode}</Text>
                      <Text style={styles.itemText}>{item.routeName}</Text>
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    query.length >= 1 && !loading
                      ? <Text style={styles.empty}>No routes found</Text>
                      : null
                  }
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827', backgroundColor: '#fff',
  },
  modalContent: {
    position: 'absolute', backgroundColor: '#fff', borderRadius: 10, maxHeight: 280,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#111827' },
  list: { maxHeight: 220 },
  item: { paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  itemCode: { fontSize: 12, fontWeight: '700', color: '#1a56db' },
  itemText: { fontSize: 13, color: '#374151', marginTop: 1 },
  empty: { padding: 14, color: '#9ca3af', textAlign: 'center' },
});
