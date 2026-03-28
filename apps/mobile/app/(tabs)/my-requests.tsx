import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, RefreshControl, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { requestMobileApi } from '@/lib/api';
import type { HelpRequest } from '@sahayasetu/types';

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  PENDING:     { bg: '#FEF3C7', text: '#92400E' },
  ASSIGNED:    { bg: '#DBEAFE', text: '#1E40AF' },
  IN_PROGRESS: { bg: '#EDE9FE', text: '#5B21B6' },
  COMPLETED:   { bg: '#D1FAE5', text: '#065F46' },
  REJECTED:    { bg: '#FEE2E2', text: '#991B1B' },
};

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH:     '#F97316',
  MEDIUM:   '#EAB308',
  LOW:      '#22C55E',
};

function RequestCard({ item, onPress }: { item: HelpRequest; onPress: () => void }) {
  const statusStyle = STATUS_COLOR[item.status] ?? { bg: '#F3F4F6', text: '#374151' };
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.requestNumber}>{item.requestNumber}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>
            {item.status.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>

      <View style={styles.cardMeta}>
        <View style={styles.priorityDot}>
          <View style={[styles.dot, { backgroundColor: PRIORITY_COLOR[item.priority] }]} />
          <Text style={styles.metaText}>{item.priority}</Text>
        </View>
        <Text style={styles.metaText}>{item.category}</Text>
        <Text style={styles.metaDate}>
          {new Date(item.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>

      {item.status === 'COMPLETED' && !item.rating && (
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={() => router.push(`/request/${item.id}/rate`)}
        >
          <Text style={styles.rateBtnText}>⭐ Rate this service</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export default function MyRequestsScreen() {
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');

  const FILTERS = [
    { label: 'All', value: '' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
  ];

  const fetchRequests = useCallback(async (reset = false) => {
    const currentPage = reset ? 1 : page;
    if (!reset && !hasMore) return;

    try {
      const params: Record<string, string> = {
        page: String(currentPage),
        limit: '10',
      };
      if (activeFilter) params.status = activeFilter;

      const res = await requestMobileApi.list(params);
      const { data, meta } = res.data;

      if (reset) {
        setRequests(data);
        setPage(2);
      } else {
        setRequests((prev) => [...prev, ...data]);
        setPage((p) => p + 1);
      }
      setHasMore(meta.hasNext);
    } catch (e) {
      console.error('Failed to fetch requests', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, hasMore, activeFilter]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    setHasMore(true);
    fetchRequests(true);
  }, [activeFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests(true);
  };

  const onEndReached = () => {
    if (!loading && hasMore) fetchRequests();
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterTab, activeFilter === f.value && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[styles.filterText, activeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            onPress={() => router.push(`/request/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? <ActivityIndicator style={styles.loader} color="#4F46E5" /> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No requests yet</Text>
            <Text style={styles.emptySubtitle}>
              Submit a help request to get started
            </Text>
            <TouchableOpacity
              style={styles.newBtn}
              onPress={() => router.push('/request/new')}
            >
              <Text style={styles.newBtnText}>New Request</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/request/new')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  filterRow: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 16,
    paddingVertical: 12, backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, backgroundColor: '#f3f4f6',
  },
  filterTabActive: { backgroundColor: '#4F46E5' },
  filterText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 100 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  requestNumber: { fontSize: 12, fontFamily: 'monospace', color: '#6b7280', fontWeight: '600' },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  title: { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 10, lineHeight: 22 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  priorityDot: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  metaText: { fontSize: 12, color: '#9ca3af' },
  metaDate: { fontSize: 12, color: '#9ca3af', marginLeft: 'auto' },

  rateBtn: {
    marginTop: 12, paddingVertical: 8, borderRadius: 10,
    backgroundColor: '#FFFBEB', alignItems: 'center',
    borderWidth: 1, borderColor: '#FDE68A',
  },
  rateBtnText: { fontSize: 13, color: '#92400E', fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 24, textAlign: 'center' },
  newBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  newBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  loader: { paddingVertical: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4F46E5', alignItems: 'center',
    justifyContent: 'center', shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4,
    shadowRadius: 10, elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 28, fontWeight: '300', marginTop: -2 },
});
