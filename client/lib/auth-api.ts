import Constants from 'expo-constants';
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

function getDefaultBaseUrl(port: number) {
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

function getConfiguredBaseUrl(envValue: string | undefined, defaultPort: number) {
  return envValue?.trim() || getDefaultBaseUrl(defaultPort);
}

export const API_BASE_URL = getConfiguredBaseUrl(
  process.env.EXPO_PUBLIC_AUTH_API_BASE_URL,
  8001,
);
export const ML_API_BASE_URL = getConfiguredBaseUrl(process.env.EXPO_PUBLIC_ML_API_BASE_URL, 8000);

function authNetworkError() {
  return new Error(`Unable to reach the auth server at ${API_BASE_URL}. Make sure the Express server is running on port 8001.`);
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
  emergencyContacts?: EmergencyContact[];
  isVerified: boolean;
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

export type MeResponse = {
  success: boolean;
  user: AuthUser;
};

export type ProfileResponse = {
  success: boolean;
  user: AuthUser & { emergencyContacts?: EmergencyContact[] };
};

export type ContactsResponse = {
  success: boolean;
  contacts: EmergencyContact[];
};

export type UpdateProfilePayload = {
  fullName: string;
  phone: string;
  city: string;
  primaryContact: string;
  secondaryContact: string;
  medicalNote: string;
  emergencyLineNumber: string;
  profileImageUrl: string;
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
};

export type SendChatMessagePayload = {
  text?: string;
  imageUrl?: string;
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
  return request<AuthOtpResponse>('/api/auth/login', {
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

function getMimeTypeFromUri(uri: string) {
  const extension = (uri.split('.').pop() || '').toLowerCase();

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
  const formData = new FormData();
  formData.append('folder', folder);
  formData.append('file', {
    uri,
    name: getFileNameFromUri(uri),
    type: getMimeTypeFromUri(uri),
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

export async function fetchChatThreads(token: string) {
  return authedJsonRequest<ChatThreadsResponse>('/api/chat/threads', token, 'GET');
}

export async function fetchChatThread(token: string, contactId: string) {
  return authedJsonRequest<ChatThreadResponse>(`/api/chat/threads/${contactId}`, token, 'GET');
}

export async function sendChatMessage(token: string, contactId: string, payload: SendChatMessagePayload) {
  return authedJsonRequest<ChatThreadResponse>(`/api/chat/threads/${contactId}/messages`, token, 'POST', payload);
}
