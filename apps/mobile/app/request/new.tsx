import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { requestMobileApi, mediaMobileApi } from '@/lib/api';
import { RequestCategory, RequestPriority, MediaFieldType } from '@sahayasetu/types';

const CATEGORIES = Object.values(RequestCategory);
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

interface AttachedMedia {
  uri: string;
  type: string;
  name: string;
  fieldType: MediaFieldType;
}

export default function NewRequestScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<RequestCategory>(RequestCategory.OTHER);
  const [priority, setPriority] = useState<RequestPriority>(RequestPriority.MEDIUM);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [media, setMedia] = useState<AttachedMedia[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);

  useEffect(() => { detectLocation(); }, []);

  const detectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is needed to attach your request location.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });

      // Reverse geocode
      const [place] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (place) {
        setAddress(
          [place.street, place.district, place.city, place.region]
            .filter(Boolean)
            .join(', '),
        );
      }
    } catch (e) {
      Alert.alert('Location error', 'Could not detect location. You can proceed without it.');
    } finally {
      setLocating(false);
    }
  };

  const attachPhoto = async (fieldType: MediaFieldType) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMedia((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: 'image/jpeg',
          name: `photo_${Date.now()}.jpg`,
          fieldType,
        },
      ]);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert('Validation', 'Please fill in title and description.');
      return;
    }
    if (!location) {
      Alert.alert('Location required', 'Please allow location access to submit a request.');
      return;
    }

    setLoading(true);
    try {
      // Create request
      const res = await requestMobileApi.create({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        location,
        address,
      });
      const requestId = res.data.id;
      const requestCreatedAt = res.data.createdAt;

      // Upload media
      for (const file of media) {
        const formData = new FormData();
        formData.append('file', { uri: file.uri, type: file.type, name: file.name } as any);

        const params: Record<string, string> = {
          requestId,
          fieldType: file.fieldType,
          requestLat: String(location.latitude),
          requestLng: String(location.longitude),
          requestCreatedAt,
        };
        if (location) {
          params.latitude = String(location.latitude);
          params.longitude = String(location.longitude);
          params.capturedAt = new Date().toISOString();
        }
        await mediaMobileApi.upload(formData, params);
      }

      Alert.alert(
        'Request Submitted!',
        `Your request #${res.data.requestNumber} has been submitted. We'll notify you when an agent is assigned.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/my-requests') }],
      );
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>New Help Request</Text>

      {/* Title */}
      <View style={styles.field}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="Brief description of the issue"
          value={title}
          onChangeText={setTitle}
          maxLength={200}
        />
      </View>

      {/* Description */}
      <View style={styles.field}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Provide more details about the problem..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={2000}
          textAlignVertical="top"
        />
      </View>

      {/* Category */}
      <View style={styles.field}>
        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, category === cat && styles.chipActive]}
                onPress={() => setCategory(cat as RequestCategory)}
              >
                <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Priority */}
      <View style={styles.field}>
        <Text style={styles.label}>Priority</Text>
        <View style={styles.chipRow}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, priority === p && styles.chipActive,
                p === 'CRITICAL' && styles.chipCritical,
                p === 'HIGH' && styles.chipHigh]}
              onPress={() => setPriority(p as RequestPriority)}
            >
              <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location */}
      <View style={styles.field}>
        <Text style={styles.label}>Location</Text>
        {locating ? (
          <View style={styles.locatingRow}>
            <ActivityIndicator size="small" color="#4F46E5" />
            <Text style={styles.locatingText}>Detecting location...</Text>
          </View>
        ) : location ? (
          <View style={styles.locationCard}>
            <Text style={styles.locationText}>
              {address || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
            </Text>
            <TouchableOpacity onPress={detectLocation}>
              <Text style={styles.refreshLocation}>Refresh</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.locationBtn} onPress={detectLocation}>
            <Text style={styles.locationBtnText}>Detect My Location</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Media */}
      <View style={styles.field}>
        <Text style={styles.label}>Attach Evidence</Text>
        <View style={styles.mediaRow}>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => attachPhoto(MediaFieldType.COMPLAINT_EVIDENCE)}
          >
            <Text style={styles.mediaBtnIcon}>📷</Text>
            <Text style={styles.mediaBtnText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => attachPhoto(MediaFieldType.SITE_IMAGE)}
          >
            <Text style={styles.mediaBtnIcon}>🏷️</Text>
            <Text style={styles.mediaBtnText}>Site Image</Text>
          </TouchableOpacity>
        </View>
        {media.length > 0 && (
          <Text style={styles.mediaCount}>{media.length} file(s) attached</Text>
        )}
      </View>

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Request</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24 },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: '#111827', backgroundColor: '#fff',
  },
  textarea: { height: 100, paddingTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 6, backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  chipCritical: { borderColor: '#fee2e2' },
  chipHigh: { borderColor: '#ffedd5' },
  chipText: { fontSize: 13, color: '#6b7280' },
  chipTextActive: { color: '#4F46E5', fontWeight: '600' },
  locatingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locatingText: { fontSize: 14, color: '#6b7280' },
  locationCard: {
    borderWidth: 1, borderColor: '#c7d2fe', borderRadius: 12,
    padding: 12, backgroundColor: '#EEF2FF', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  locationText: { fontSize: 13, color: '#3730a3', flex: 1 },
  refreshLocation: { fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  locationBtn: {
    borderWidth: 1, borderColor: '#4F46E5', borderRadius: 12,
    padding: 12, alignItems: 'center',
  },
  locationBtnText: { color: '#4F46E5', fontSize: 14, fontWeight: '500' },
  mediaRow: { flexDirection: 'row', gap: 12 },
  mediaBtn: {
    flex: 1, borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 16, alignItems: 'center', backgroundColor: '#fff',
    borderStyle: 'dashed',
  },
  mediaBtnIcon: { fontSize: 24, marginBottom: 4 },
  mediaBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  mediaCount: { marginTop: 8, fontSize: 13, color: '#4F46E5', fontWeight: '500' },
  submitBtn: {
    backgroundColor: '#4F46E5', borderRadius: 12, height: 54,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
