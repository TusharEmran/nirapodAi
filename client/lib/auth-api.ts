import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getHostFromExpo() {
  const expoConfig = Constants.expoConfig as
    | (typeof Constants.expoConfig & { debuggerHost?: string })
    | null
    | undefined;
  const hostUri =
    expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    expoConfig?.debuggerHost;

  if (!hostUri) {
    return null;
  }

  return hostUri.replace(/^exp(s)?:\/\//, '').split(':')[0] || null;
}

function getDevelopmentBaseUrl(port: number) {
  if (Platform.OS === 'web') {
    return `http://localhost:${port}`;
  }

  const expoHost = getHostFromExpo();

  if (expoHost) {
    return `http://${expoHost}:${port}`;
  }

  if (Platform.OS === 'android') {
    return `http://10.0.2.2:${port}`;
  }

  return `http://localhost:${port}`;
}

function getConfiguredBaseUrl(envValue: string | undefined, defaultPort: number, serviceName: string) {
  const configuredUrl = envValue?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (__DEV__) {
    return getDevelopmentBaseUrl(defaultPort);
  }

  return `missing-${serviceName}-base-url`;
}

export const API_BASE_URL = getConfiguredBaseUrl(
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL,
  8001,
  'auth',
);
export const ML_API_BASE_URL = getConfiguredBaseUrl(process.env.EXPO_PUBLIC_ML_API_BASE_URL, 8000, 'ml');

function isMissingBaseUrl(baseUrl: string) {
  return baseUrl.startsWith('missing-');
}

export function getMissingApiConfigMessage(baseUrl: string) {
  if (baseUrl === API_BASE_URL && isMissingBaseUrl(baseUrl)) {
    return 'Auth server URL is missing. Set EXPO_PUBLIC_AUTH_API_BASE_URL to your deployed HTTPS backend URL before building the APK.';
  }

  if (baseUrl === ML_API_BASE_URL && isMissingBaseUrl(baseUrl)) {
    return 'ML server URL is missing. Set EXPO_PUBLIC_ML_API_BASE_URL to your deployed HTTPS ML backend URL before building the APK.';
  }

  return null;
}

function authNetworkError() {
  const missingConfigMessage = getMissingApiConfigMessage(API_BASE_URL);

  if (missingConfigMessage) {
    return new Error(missingConfigMessage);
  }

  return new Error(`Unable to reach the auth server at ${API_BASE_URL}. Make sure this is a public backend URL reachable from this phone.`);
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type RequestOptions = {
  body?: Record<string, unknown>;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options.body ?? {}),
    });
  } catch {
    throw authNetworkError();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

async function authedRequest<T>(path: string, token: string): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw authNetworkError();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string;
  primaryContact?: string;
  secondaryContact?: string;
  medicalNote?: string;
  emergencyLineNumber?: string;
  profileImageUrl?: string;
  safetySettings?: SafetySettings;
  privacySettings?: PrivacySettings;
  fakeCallAudioUrl?: string;
  fakeCallAudioName?: string;
  emergencyContacts?: EmergencyContact[];
  isVerified: boolean;
};

export type SafetySettings = {
  sosCountdownSeconds: number;
  alertRecipients: 'all-contacts' | 'priority-contacts' | 'favorites';
  liveLocationMode: 'always' | 'sos-only' | 'manual';
  fakeCallLineNumber: string;
  sirenPassword: string;
  sirenVolume: 'low' | 'medium' | 'high';
  sirenAutoStopSeconds: number;
  watchSensitivity: 'low' | 'medium' | 'high';
  silentEmergencyMode: 'vibrate-only' | 'flash-screen' | 'sound-alarm';
  testSosMode: boolean;
  fakeCallAudioUrl: string;
  fakeCallAudioName: string;
};

export type PrivacySettings = {
  profileVisibility: 'public' | 'contacts-only' | 'private';
  locationHistoryRetention: 'off' | '24-hours' | '7-days' | '30-days';
  messageAccess: 'anyone' | 'contacts' | 'app-users';
  showOnlineStatus: boolean;
  hidePhoneNumber: boolean;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  initials: string;
  avatar: string;
  isAppUser?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type OtpChallenge = {
  userId: string;
  expiresAt: string;
  purpose: 'signup' | 'login';
};

export type AuthOtpResponse = {
  success: boolean;
  message: string;
  otpRequired: boolean;
  user: AuthUser;
  challenge: OtpChallenge;
  devOtp?: string;
};

export type VerifyOtpResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export type LoginResponse = {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
};

export type MeResponse = {
  success: boolean;
  user: AuthUser;
};

export type ProfileResponse = {
  success: boolean;
  user: AuthUser & { emergencyContacts?: EmergencyContact[]; safetySettings?: SafetySettings; privacySettings?: PrivacySettings };
};

export type ContactsResponse = {
  success: boolean;
  contacts: EmergencyContact[];
};

export type UpdateProfilePayload = {
  fullName?: string;
  phone?: string;
  city?: string;
  primaryContact?: string;
  secondaryContact?: string;
  medicalNote?: string;
  emergencyLineNumber?: string;
  profileImageUrl?: string;
  safetySettings?: Partial<SafetySettings>;
  privacySettings?: Partial<PrivacySettings>;
};

export type UploadMediaResponse = {
  success: boolean;
  url: string;
  publicId: string;
};

export type AddContactPayload = {
  emergencyContacts?: EmergencyContact[];
  name: string;
  phone: string;
  relationship: string;
};

export type UpdateContactPayload = {
  name: string;
  phone: string;
  relationship: string;
};

export type ChatThreadSummary = {
  id: string;
  name: string;
  subtitle: string;
  accent: string;
  message: string;
  time: string;
  unread: boolean;
};

export type ChatMessage = {
  id: string;
  sender: 'me' | 'them';
  text: string;
  imageUrl?: string;
  localImageUri?: string;
  locationUrl?: string;
  read: boolean;
  time: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ChatThreadDetails = ChatThreadSummary & {
  messages: ChatMessage[];
};

export type ChatThreadsResponse = {
  success: boolean;
  threads: ChatThreadSummary[];
};

export type ChatThreadResponse = {
  success: boolean;
  thread: ChatThreadDetails;
  message?: ChatMessage;
};

export type SendChatMessagePayload = {
  text?: string;
  imageUrl?: string;
};

export type EmergencySosPayload = {
  latitude: number;
  longitude: number;
};

export type EmergencySosResponse = {
  success: boolean;
  message: string;
  defaultMessage: string;
  locationUrl: string;
  notifiedCount: number;
  skippedCount: number;
};

export async function signupUser(payload: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  return request<AuthOtpResponse>('/api/auth/signup', {
    body: payload,
  });
}

export async function loginUser(payload: {
  identifier: string;
  password: string;
}) {
  return request<LoginResponse>('/api/auth/login', {
    body: payload,
  });
}

export async function verifyOtp(payload: {
  userId: string;
  code: string;
}) {
  return request<VerifyOtpResponse>('/api/auth/verify-otp', {
    body: payload,
  });
}

export async function resendOtp(payload: {
  identifier: string;
}) {
  return request<AuthOtpResponse>('/api/auth/resend-otp', {
    body: payload,
  });
}

export async function fetchCurrentUser(token: string) {
  return authedRequest<MeResponse>('/api/auth/me', token);
}

export async function fetchProfile(token: string) {
  return authedRequest<ProfileResponse>('/api/profile', token);
}

export async function fetchContacts(token: string) {
  return authedRequest<ContactsResponse>('/api/profile/contacts', token);
}

export async function addContact(token: string, payload: AddContactPayload) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/profile/contacts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    await queueOfflineRequest('/api/profile/contacts', 'POST', payload);
    throw authNetworkError();
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return body as ContactsResponse;
}

export async function updateContact(token: string, contactId: string, payload: UpdateContactPayload) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/profile/contacts/${contactId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    await queueOfflineRequest(`/api/profile/contacts/${contactId}`, 'PUT', payload);
    throw authNetworkError();
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return body as ContactsResponse;
}

export async function deleteContact(token: string, contactId: string) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/profile/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    await queueOfflineRequest(`/api/profile/contacts/${contactId}`, 'DELETE');
    throw authNetworkError();
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return body as ContactsResponse;
}

export async function updateProfile(token: string, payload: UpdateProfilePayload) {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    await queueOfflineRequest('/api/profile', 'PUT', payload);
    throw authNetworkError();
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || 'Request failed';
    throw new Error(message);
  }

  return body as ProfileResponse;
}

async function authedJsonRequest<T>(
  path: string,
  token: string,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    if (method !== 'GET') {
      await queueOfflineRequest(path, method, body);
    }
    throw authNetworkError();
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message = payload?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return payload as T;
}

function getFileNameFromUri(uri: string) {
  const cleanedUri = uri.split('?')[0] || uri;
  const segments = cleanedUri.split('/');
  return segments[segments.length - 1] || 'upload.jpg';
}

function getMimeTypeFromUri(uri: string, fileName?: string) {
  const source = fileName || uri;
  const extension = (source.split('.').pop() || '').toLowerCase();

  if (extension === 'mp3') {
    return 'audio/mpeg';
  }

  if (extension === 'm4a') {
    return 'audio/mp4';
  }

  if (extension === 'aac') {
    return 'audio/aac';
  }

  if (extension === 'wav') {
    return 'audio/wav';
  }

  if (extension === 'ogg') {
    return 'audio/ogg';
  }

  if (extension === 'flac') {
    return 'audio/flac';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  if (extension === 'heic' || extension === 'heif') {
    return `image/${extension}`;
  }

  return 'image/jpeg';
}

export async function uploadMedia(token: string, uri: string, folder: string) {
  return uploadMediaFile(token, { uri, folder });
}

export async function uploadMediaFile(token: string, file: { uri: string; folder: string; name?: string; type?: string }) {
  const formData = new FormData();
  formData.append('folder', file.folder);
  formData.append('file', {
    uri: file.uri,
    name: file.name || getFileNameFromUri(file.uri),
    type: file.type || getMimeTypeFromUri(file.uri, file.name),
  } as never);

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/media/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw authNetworkError();
  }

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message = body?.message || 'Request failed';
    throw new ApiError(message, response.status);
  }

  return body as UploadMediaResponse;
}

const OFFLINE_GENERAL_QUEUE_KEY = 'nirapodai.offline.general.queue';

export async function queueOfflineRequest(path: string, method: string, body?: any) {
  try {
    const queueStr = await SecureStore.getItemAsync(OFFLINE_GENERAL_QUEUE_KEY);
    const queue = queueStr ? JSON.parse(queueStr) : [];
    queue.push({ path, method, body });
    await SecureStore.setItemAsync(OFFLINE_GENERAL_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue offline request', error);
  }
}

export async function syncOfflineRequests(token: string) {
  try {
    const queueStr = await SecureStore.getItemAsync(OFFLINE_GENERAL_QUEUE_KEY);
    if (!queueStr) return;
    
    const queue = JSON.parse(queueStr);
    if (queue.length === 0) return;

    let pending = [...queue];

    for (const req of queue) {
      try {
        await fetch(`${API_BASE_URL}${req.path}`, {
          method: req.method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: req.body ? (typeof req.body === 'string' ? req.body : JSON.stringify(req.body)) : undefined,
        });
        pending.shift();
      } catch (error: any) {
        break; // Network error, stop syncing
      }
    }

    if (pending.length > 0) {
      await SecureStore.setItemAsync(OFFLINE_GENERAL_QUEUE_KEY, JSON.stringify(pending));
    } else {
      await SecureStore.deleteItemAsync(OFFLINE_GENERAL_QUEUE_KEY);
    }
  } catch (error) {
    console.error('Failed to sync offline general requests', error);
  }
}

const OFFLINE_SOS_QUEUE_KEY = 'nirapodai.offline.sos.queue';

export async function queueOfflineSosRequest(payload: EmergencySosPayload) {
  try {
    const queueStr = await SecureStore.getItemAsync(OFFLINE_SOS_QUEUE_KEY);
    const queue: EmergencySosPayload[] = queueStr ? JSON.parse(queueStr) : [];
    queue.push(payload);
    await SecureStore.setItemAsync(OFFLINE_SOS_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to queue offline SOS request', error);
  }
}

export async function syncOfflineSosRequests(token: string) {
  try {
    const queueStr = await SecureStore.getItemAsync(OFFLINE_SOS_QUEUE_KEY);
    if (!queueStr) return;
    
    const queue: EmergencySosPayload[] = JSON.parse(queueStr);
    if (queue.length === 0) return;

    let pending = [...queue];

    for (const payload of queue) {
      try {
        await authedJsonRequest<EmergencySosResponse>('/api/emergency/sos', token, 'POST', payload);
        pending.shift();
      } catch (error: any) {
        if (error?.message?.includes('Unable to reach the auth server')) {
          // Still offline, stop syncing
          break;
        }
        // If it's a 4xx or 5xx, we might discard it so it doesn't block forever
        pending.shift();
      }
    }

    if (pending.length > 0) {
      await SecureStore.setItemAsync(OFFLINE_SOS_QUEUE_KEY, JSON.stringify(pending));
    } else {
      await SecureStore.deleteItemAsync(OFFLINE_SOS_QUEUE_KEY);
    }
  } catch (error) {
    console.error('Failed to sync offline SOS requests', error);
  }
}

export async function sendEmergencySOS(token: string, payload: EmergencySosPayload) {
  try {
    return await authedJsonRequest<EmergencySosResponse>('/api/emergency/sos', token, 'POST', payload);
  } catch (error: any) {
    if (error?.message?.includes('Unable to reach the auth server')) {
      await queueOfflineSosRequest(payload);
      return {
        success: true,
        message: 'Saved offline. Alert will be sent when connection restores.',
        defaultMessage: 'Offline Mode',
        locationUrl: '',
        notifiedCount: 0,
        skippedCount: 0,
      } as EmergencySosResponse;
    }
    throw error;
  }
}

export async function fetchChatThreads(token: string) {
  return authedJsonRequest<ChatThreadsResponse>('/api/chat/threads', token, 'GET');
}

export async function fetchChatThread(token: string, contactId: string) {
  return authedJsonRequest<ChatThreadResponse>(`/api/chat/threads/${contactId}`, token, 'GET');
}

export async function sendChatMessage(token: string, contactId: string, payload: SendChatMessagePayload) {
  return authedJsonRequest<ChatThreadResponse>(`/api/chat/threads/${contactId}/messages`, token, 'POST', payload);
}
