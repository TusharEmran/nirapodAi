import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'nirapodai.auth.token';

export async function saveAuthToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function loadAuthToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearAuthToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}
