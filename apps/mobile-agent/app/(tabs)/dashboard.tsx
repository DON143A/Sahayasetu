import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { requestMobileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { HelpRequest } from '@sahayasetu/types';

const PRIORITY_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: '#FEF2F2', text: '#991B1B', border: '#FCA5A5' },
  HIGH:     { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74' },
  MEDIUM:   { bg: '#FEFCE8', text: '#854D0E', border: '#FDE047' },
  LOW:      { bg: '#F0FDF4', text: '#166534', border: '#86EFAC' },
};

function AssignedCard({ item, onAccept, onNavigate }: {
  item: HelpRequest;
  onAccept: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const p = PRIORITY_COLOR[item.priority] ?? PRIORITY_COLOR.MEDIUM;
  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: p.border, borderLeftWidth: 4 }]}
      onPress={() => router.push(`/request/${item.id}/verify`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.requestNum}>{item.requestNumber}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: p.bg }]}>
          <Text style={[styles.priorityText, { color: p.text }]}>{item.priority}</Text>
        </View>
      </View>

      <Text style={styles.category}>{item.category}</Text>

      {item.address && (
        <Text style={styles.address} numberOfLines={1}>📍 {item.address}</Text>
      )}

      <View style={styles.actionRow}>
        {item.status === 'ASSIGNED' && (
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={() => onAccept(item.id)}
          >
            <Text style={styles.acceptBtnText}>Start Work</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => onNavigate(item.id)}
        >
          <Text style={styles.navBtnText}>Navigate</Text>
        </TouchableOpacity>
        {item.status === 'IN_PROGRESS' && (
          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={() => router.push(`/request/${item.id}/verify`)}
          >
            <Text style={styles.verifyBtnText}>Verify & Complete</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function AgentDashboard() {
  const { user } = useAuthStore();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, inProgress: 0, completed: 0 });

  const fetchData = useCallback(async (reset = false) => {
    try {
      const [reqRes, statsRes] = await Promise.all([
        requestMobileApi.list({ limit: '50' }),
        requestMobileApi.list({ status: 'COMPLETED', limit: '1' }),
      ]);
      setRequests(reqRes.data.data);
      setStats({
        total: reqRes.data.meta.total,
        inProgress: reqRes.data.data.filter((r: HelpRequest) => r.status === 'IN_PROGRESS').length,
        completed: statsRes.data.meta.total,
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const handleAccept = async (id: string) => {
    try {
      await requestMobileApi.updateStatus(id, 'IN_PROGRESS', 'Agent started work');
      setRequests((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: 'IN_PROGRESS' as any } : r)
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update status');
    }
  };

  const handleNavigate = async (id: string) => {
    const req = requests.find((r) => r.id === id);
    if (!req?.location) { Alert.alert('No location', 'Request has no location attached.'); return; }
    const { latitude, longitude } = req.location;
    // Open native maps
    const url = Platform.OS === 'ios'
      ? `maps://app?daddr=${latitude},${longitude}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}`;
    const Linking = require('expo-linking');
    Linking.openURL(url);
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatBox label="Assigned" value={stats.total} color="#4F46E5" />
        <StatBox label="In Progress" value={stats.inProgress} color="#7C3AED" />
        <StatBox label="Completed" value={stats.completed} color="#059669" />
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AssignedCard
            item={item}
            onAccept={handleAccept}
            onNavigate={handleNavigate}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(true); }}
            tintColor="#4F46E5"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No pending assignments</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        }
      />
    </View>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statBox, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const { Platform } = require('react-native');

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  statsRow: {
    flexDirection: 'row', gap: 10, padding: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  statBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700' },
  statLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2, fontWeight: '500' },

  list: { padding: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  requestNum: { fontSize: 11, fontFamily: 'monospace', color: '#6b7280' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111827', maxWidth: '90%', marginTop: 2 },
  priorityBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, height: 28 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  category: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
  address: { fontSize: 13, color: '#374151', marginBottom: 12 },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  acceptBtn: {
    flex: 1, backgroundColor: '#4F46E5', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  navBtn: {
    borderWidth: 1, borderColor: '#4F46E5', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  navBtnText: { color: '#4F46E5', fontWeight: '600', fontSize: 13 },
  verifyBtn: {
    flex: 1, backgroundColor: '#059669', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center',
  },
  verifyBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: '#9ca3af' },
});
