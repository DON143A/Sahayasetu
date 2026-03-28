import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { authMobileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

type Step = 'phone' | 'otp';

export default function LoginScreen() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpRefs = useRef<(TextInput | null)[]>([]);
  const { setAuth } = useAuthStore();

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      await authMobileApi.sendOtp(formattedPhone);
      setStep('otp');
      startResendTimer();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (!value && index > 0) otpRefs.current[index - 1]?.focus();
    if (newOtp.every((d) => d !== '') && index === 5) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const otpCode = code || otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const res = await authMobileApi.verifyOtp(formattedPhone, otpCode);
      const { tokens, user } = res.data;
      setAuth(user, tokens);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>SS</Text>
          </View>
          <Text style={styles.brandName}>SahayaSetu</Text>
          <Text style={styles.tagline}>Help is on its way</Text>
        </View>

        {step === 'phone' ? (
          <>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              We'll send you a one-time password to verify your identity
            </Text>

            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="98765 43210"
                keyboardType="phone-pad"
                maxLength={10}
                value={phone}
                onChangeText={setPhone}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleSendOtp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send OTP</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Enter OTP</Text>
            <Text style={styles.subtitle}>
              Sent to +91{phone}
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(ref) => { otpRefs.current[i] = ref; }}
                  style={[styles.otpInput, digit && styles.otpInputFilled]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  selectTextOnFocus
                />
              ))}
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={() => handleVerifyOtp()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify & Login</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendBtn}
              disabled={resendTimer > 0}
              onPress={handleSendOtp}
            >
              <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend OTP'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.changePhone}>Change phone number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3FF', justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logoBadge: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: '#4F46E5',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  logoText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  brandName: { fontSize: 22, fontWeight: '700', color: '#1e1b4b' },
  tagline: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  title: { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  phoneRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  countryCode: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, justifyContent: 'center', backgroundColor: '#f9fafb',
  },
  countryCodeText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  phoneInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, fontSize: 16, color: '#111827', height: 52,
  },
  btn: {
    backgroundColor: '#4F46E5', borderRadius: 12, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  otpInput: {
    width: 46, height: 56, borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, textAlign: 'center', fontSize: 20,
    fontWeight: '600', color: '#111827',
  },
  otpInputFilled: { borderColor: '#4F46E5', backgroundColor: '#EEF2FF' },
  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { fontSize: 14, color: '#4F46E5', fontWeight: '500' },
  resendDisabled: { color: '#9ca3af' },
  changePhone: {
    textAlign: 'center', marginTop: 12, fontSize: 13,
    color: '#6b7280', textDecorationLine: 'underline',
  },
});
