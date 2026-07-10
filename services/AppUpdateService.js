import * as Updates from 'expo-updates';

export async function checkForAppUpdate() {
  if (__DEV__) {
    return { available: false, message: 'App update checks only work in an installed release build.' };
  }
  const result = await Updates.checkForUpdateAsync();
  if (!result.isAvailable) return { available: false, message: 'The app is already up to date.' };
  await Updates.fetchUpdateAsync();
  return { available: true, message: 'The app update has downloaded and is ready to install.' };
}

export async function applyAppUpdate() {
  await Updates.reloadAsync();
}
