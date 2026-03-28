import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useLocalSearchParams, router } from 'expo-router';
import { requestMobileApi, mediaMobileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { MediaFieldType } from '@sahayasetu/types';

interface ProofSlot {
  fieldType: MediaFieldType;
  label: string;
  required: boolean;
  uri?: string;
}

const PROOF_SLOTS: ProofSlot[] = [
  { fieldType: MediaFieldType.SITE_IMAGE,     label: 'Site / Location Photo',  required: true },
  { fieldType: MediaFieldType.DELIVERY_PHOTO, label: 'Delivery / Completion',  required: true },
  { fieldType: MediaFieldType.RECEIPT_PROOF,  label: 'Receipt / Document',     required: false },
  { fieldType: MediaFieldType.VIDEO_PROOF,    label: 'Video Evidence',          required: false },
];

export default function VerifyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [request, setRequest] = useState<any>(null);
  const [slots, setSlots] = useState<ProofSlot[]>(PROOF_SLOTS);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequest();
    getLocation();
  }, []);

  const fetchRequest = async () => {
    try {
      const res = await requestMobileApi.get(id);
      setRequest(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
  };

  const capturePhoto = async (index: number) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      exif: true,
    });
    if (!result.canceled && result.assets[0]) {
      setSlots((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], uri: result.assets[0].uri };
        return updated;
      });
    }
  };

  const captureVideo = async (index: number) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 60,
    });
    if (!result.canceled && result.assets[0]) {
      setSlots((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], uri: result.assets[0].uri };
        return updated;
      });
    }
  };

  const handleSubmit = async () => {
    const requiredMissing = slots.filter((s) => s.required && !s.uri);
    if (requiredMissing.length > 0) {
      Alert.alert(
        'Missing required photos',
        `Please capture: ${requiredMissing.map((s) => s.label).join(', ')}`,
      );
      return;
    }

    if (!location) {
      Alert.alert(
        'Location required',
        'GPS location is required for verification. Please enable location and try again.',
      );
      return;
    }

    Alert.alert(
      'Complete Request',
      'This will mark the request as completed and submit all verification media. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'default',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Upload all captured media
              for (const slot of slots.filter((s) => s.uri)) {
                const isVideo = slot.fieldType === MediaFieldType.VIDEO_PROOF;
                const formData = new FormData();
                formData.append('file', {
                  uri: slot.uri!,
                  type: isVideo ? 'video/mp4' : 'image/jpeg',
                  name: `${slot.fieldType}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
                } as any);

                await mediaMobileApi.upload(formData, {
                  requestId: id,
                  fieldType: slot.fieldType,
                  latitude: String(location.latitude),
                  longitude: String(location.longitude),
                  capturedAt: new Date().toISOString(),
                  requestLat: String(request.location.latitude),
                  requestLng: String(request.location.longitude),
                  requestCreatedAt: request.createdAt,
                });
              }

              // Mark as completed
              await requestMobileApi.updateStatus(id, 'COMPLETED', 'Verified by field agent');

              Alert.alert(
                'Request Completed!',
                'All verification media has been submitted successfully.',
                [{ text: 'Done', onPress: () => router.back() }],
              );
            } catch (e: any) {
              Alert.alert('Error', e.response?.data?.message || 'Submission failed. Try again.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4F46E5" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Verification Checklist</Text>
      {request && (
        <View style={styles.requestInfo}>
          <Text style={styles.requestNum}>{request.requestNumber}</Text>
          <Text style={styles.requestTitle}>{request.title}</Text>
        </View>
      )}

      {/* GPS Status */}
      <View style={[styles.gpsCard, location ? styles.gpsOk : styles.gpsMissing]}>
        <Text style={styles.gpsIcon}>{location ? '✅' : '⚠️'}</Text>
        <View>
          <Text style={styles.gpsTitle}>
            {location ? 'GPS Location Acquired' : 'Waiting for GPS...'}
          </Text>
          {location && (
            <Text style={styles.gpsCoords}>
              {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
            </Text>
          )}
        </View>
      </View>

      {/* Proof slots */}
      {slots.map((slot, index) => (
        <View key={slot.fieldType} style={styles.slotCard}>
          <View style={styles.slotHeader}>
            <Text style={styles.slotLabel}>
              {slot.label}
              {slot.required && <Text style={styles.required}> *</Text>}
            </Text>
            {slot.uri && <Text style={styles.captured}>✓ Captured</Text>}
          </View>

          {slot.uri ? (
            <View>
              {slot.fieldType !== MediaFieldType.VIDEO_PROOF ? (
                <Image source={{ uri: slot.uri }} style={styles.preview} />
              ) : (
                <View style={styles.videoPlaceholder}>
                  <Text style={styles.videoPlaceholderText}>🎬 Video captured</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.retakeBtn}
                onPress={() =>
                  slot.fieldType === MediaFieldType.VIDEO_PROOF
                    ? captureVideo(index)
                    : capturePhoto(index)
                }
              >
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={() =>
                slot.fieldType === MediaFieldType.VIDEO_PROOF
                  ? captureVideo(index)
                  : capturePhoto(index)
              }
            >
              <Text style={styles.captureBtnIcon}>
                {slot.fieldType === MediaFieldType.VIDEO_PROOF ? '🎬' : '📷'}
              </Text>
              <Text style={styles.captureBtnText}>
                {slot.fieldType === MediaFieldType.VIDEO_PROOF ? 'Record Video' : 'Take Photo'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ))}

      {/* Submit */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <View style={styles.submittingRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.submitBtnText}>  Submitting...</Text>
          </View>
        ) : (
          <Text style={styles.submitBtnText}>Complete & Submit Verification</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },

  requestInfo: {
    backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  requestNum: { fontSize: 11, fontFamily: 'monospace', color: '#6b7280' },
  requestTitle: { fontSize: 14, fontWeight: '600', color: '#1e1b4b', marginTop: 2 },

  gpsCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 12, padding: 14, marginBottom: 14,
  },
  gpsOk:      { backgroundColor: '#D1FAE5', borderWidth: 1, borderColor: '#6EE7B7' },
  gpsMissing: { backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D' },
  gpsIcon: { fontSize: 22 },
  gpsTitle: { fontSize: 13, fontWeight: '600', color: '#111827' },
  gpsCoords: { fontSize: 11, color: '#6b7280', fontFamily: 'monospace', marginTop: 2 },

  slotCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05,
    shadowRadius: 3, elevation: 2,
  },
  slotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  slotLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  required: { color: '#EF4444' },
  captured: { fontSize: 13, color: '#059669', fontWeight: '600' },

  captureBtn: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12,
    borderStyle: 'dashed', padding: 24, alignItems: 'center',
  },
  captureBtnIcon: { fontSize: 32, marginBottom: 8 },
  captureBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '500' },

  preview: { width: '100%', height: 200, borderRadius: 10, resizeMode: 'cover' },
  videoPlaceholder: {
    width: '100%', height: 120, borderRadius: 10,
    backgroundColor: '#1f2937', alignItems: 'center', justifyContent: 'center',
  },
  videoPlaceholderText: { fontSize: 16 },

  retakeBtn: {
    marginTop: 10, borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, padding: 8, alignItems: 'center',
  },
  retakeBtnText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },

  submitBtn: {
    backgroundColor: '#059669', borderRadius: 14, height: 56,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  submittingRow: { flexDirection: 'row', alignItems: 'center' },
});
