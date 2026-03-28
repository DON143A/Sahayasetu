import * as bcrypt from 'bcrypt';
import { PaginationMeta } from '@sahayasetu/types';

// ─── Hashing ─────────────────────────────────────────────────────────────────

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

export const comparePassword = async (
  plain: string,
  hashed: string,
): Promise<boolean> => {
  return bcrypt.compare(plain, hashed);
};

// ─── OTP ─────────────────────────────────────────────────────────────────────

export const generateOtp = (length = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
};

export const generateRequestNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SS-${timestamp}-${random}`;
};

// ─── Pagination ───────────────────────────────────────────────────────────────

export const buildPaginationMeta = (
  total: number,
  page: number,
  limit: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

export const paginationDefaults = (
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } => {
  const p = Math.max(1, page ?? 1);
  const l = Math.min(100, Math.max(1, limit ?? 20));
  return { page: p, limit: l, skip: (p - 1) * l };
};

// ─── Geo ──────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_KM = 6371;

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

const toRad = (value: number): number => (value * Math.PI) / 180;

export const isWithinRadius = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  radiusKm: number,
): boolean => calculateDistance(lat1, lon1, lat2, lon2) <= radiusKm;

// ─── Validators ──────────────────────────────────────────────────────────────

export const isValidPhone = (phone: string): boolean =>
  /^\+?[1-9]\d{9,14}$/.test(phone);

export const isValidEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const sanitizeString = (str: string): string =>
  str.trim().replace(/[<>]/g, '');

// ─── Date ────────────────────────────────────────────────────────────────────

export const addMinutes = (date: Date, minutes: number): Date => {
  return new Date(date.getTime() + minutes * 60 * 1000);
};

export const isExpired = (date: Date): boolean => date < new Date();

export const formatDuration = (ms: number): string => {
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

// ─── Response helpers ─────────────────────────────────────────────────────────

export const successResponse = <T>(
  message: string,
  data?: T,
  statusCode = 200,
) => ({ success: true, message, data, statusCode });

export const errorResponse = (
  message: string,
  error?: string,
  statusCode = 400,
) => ({ success: false, message, error, statusCode });
