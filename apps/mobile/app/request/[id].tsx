import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { io, Socket } from 'socket.io-client';
import { requestMobileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { HelpRequest, ChatMessage } from '@sahayasetu/types';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL?.replace('/api/v1', '') || 'http://localhost:8080';

const STATUS_STEPS = ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, tokens } = useAuthStore();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    fetchRequest();
    setupSocket();
    return () => { socketRef.current?.disconnect(); };
  }, [id]);

  const fetchRequest = async () => {
    try {
      const res = await requestMobileApi.get(id);
      setRequest(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const setupSocket = () => {
    // Connect to request updates namespace
    const requestSocket = io(`${API_URL}/requests`, {
      query: { userId: user?.id },
      extraHeaders: { Authorization: `Bearer ${tokens?.accessToken}` },
    });
    requestSocket.emit('join:request', { requestId: id });
    requestSocket.on('request:updated', (data) => {
      setRequest((prev) => prev ? { ...prev, status: data.status } : prev);
    });

    // Connect to chat namespace
    const chatSocket = io(`${API_URL}/chat`, {
      query: { requestId: id },
      extraHeaders: { Authorization: `Bearer ${tokens?.accessToken}` },
    });
    chatSocket.on('connect', () => {
      chatSocket.emit('chat:history', { requestId: id }, (history: ChatMessage[]) => {
        setMessages(history);
      });
    });
    chatSocket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      scrollRef.current?.scrollToEnd({ animated: true });
    });

    socketRef.current = chatSocket;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !socketRef.current) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    socketRef.current.emit('chat:send', {
      requestId: id,
      content,
      senderId: user?.id,
      senderRole: user?.role,
    });
    setSending(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Request not found</Text>
      </View>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(request.status);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView ref={scrollRef} style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerCard}>
          <Text style={styles.requestNumber}>{request.requestNumber}</Text>
          <Text style={styles.title}>{request.title}</Text>
          <Text style={styles.description}>{request.description}</Text>
          <View style={styles.metaRow}>
            <MetaChip label={request.category} />
            <MetaChip label={request.priority} />
          </View>
        </View>

        {/* Progress tracker */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.progressRow}>
            {STATUS_STEPS.map((step, i) => (
              <React.Fragment key={step}>
                <View style={styles.stepItem}>
                  <View style={[
                    styles.stepCircle,
                    i <= currentStep && styles.stepCircleActive,
                    i === currentStep && styles.stepCircleCurrent,
                  ]}>
                    {i < currentStep && <Text style={styles.stepCheck}>✓</Text>}
                    {i === currentStep && <View style={styles.stepDot} />}
                  </View>
                  <Text style={[
                    styles.stepLabel,
                    i <= currentStep && styles.stepLabelActive,
                  ]}>
                    {step.replace('_', ' ')}
                  </Text>
                </View>
                {i < STATUS_STEPS.length - 1 && (
                  <View style={[styles.stepLine, i < currentStep && styles.stepLineActive]} />
                )}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Location */}
        {request.address && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <Text style={styles.locationText}>{request.address}</Text>
          </View>
        )}

        {/* Chat */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chat with Agent</Text>

          {messages.length === 0 ? (
            <Text style={styles.noMessages}>No messages yet. Start a conversation.</Text>
          ) : (
            <View style={styles.chatBox}>
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <View
                    key={msg.id}
                    style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
                  >
                    {!isMe && (
                      <Text style={styles.bubbleSender}>{msg.senderRole}</Text>
                    )}
                    <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>
                      {msg.content}
                    </Text>
                    <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                      {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Chat input */}
      {request.status !== 'COMPLETED' && request.status !== 'REJECTED' && (
        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!newMessage.trim() || sending) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: '#6b7280' },

  headerCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2,
  },
  requestNumber: { fontSize: 12, fontFamily: 'monospace', color: '#6b7280', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 },
  description: { fontSize: 14, color: '#6b7280', lineHeight: 22, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: '#EEF2FF', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  chipText: { fontSize: 12, color: '#4F46E5', fontWeight: '600' },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 12, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06,
    shadowRadius: 4, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },

  progressRow: { flexDirection: 'row', alignItems: 'flex-start' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: '#e5e7eb',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  stepCircleActive: { borderColor: '#4F46E5', backgroundColor: '#4F46E5' },
  stepCircleCurrent: { borderColor: '#4F46E5', backgroundColor: '#fff' },
  stepCheck: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#e5e7eb', marginTop: 13 },
  stepLineActive: { backgroundColor: '#4F46E5' },
  stepLabel: { fontSize: 10, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  stepLabelActive: { color: '#4F46E5', fontWeight: '600' },

  locationText: { fontSize: 14, color: '#374151', lineHeight: 20 },

  noMessages: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 16 },
  chatBox: { gap: 10 },
  bubble: {
    maxWidth: '80%', borderRadius: 16, paddingHorizontal: 14,
    paddingVertical: 10, backgroundColor: '#f3f4f6',
  },
  bubbleMe: {
    alignSelf: 'flex-end', backgroundColor: '#4F46E5',
    borderBottomRightRadius: 4,
  },
  bubbleThem: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleSender: { fontSize: 11, color: '#6b7280', fontWeight: '600', marginBottom: 3 },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bubbleTextMe: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#9ca3af', marginTop: 4, textAlign: 'right' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  inputBar: {
    flexDirection: 'row', gap: 10, padding: 12,
    backgroundColor: '#fff', borderTopWidth: 1,
    borderTopColor: '#f3f4f6', alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    maxHeight: 100, color: '#111827',
  },
  sendBtn: {
    backgroundColor: '#4F46E5', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 10,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
