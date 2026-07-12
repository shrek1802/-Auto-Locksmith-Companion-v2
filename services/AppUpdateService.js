import { Linking, Platform } from 'react-native';
import appConfig from '../app.json';

const UPDATE_METADATA_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/APK/latest.json';

const LATEST_APK_URL =
  'https://raw.githubusercontent.com/shrek1802/locksmith-companion-database/main/APK/latest.apk';

let pendingApkUrl = LATEST_APK_URL;

function getInstalledVersion() {
  return String(appConfig?.expo?.version || '0.0.0');
}

function getInstalledBuild() {
  if (Platform.OS === 'android') {
    return Number(appConfig?.expo?.android?.versionCode || 0);
  }

  return Number(appConfig?.expo?.ios?.buildNumber || 0);
}

function addCacheBuster(url) {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}

async function openUrl(url, errorMessage) {
  const supported = await Linking.canOpenURL(url);

  if (!supported) {
    throw new Error(errorMessage);
  }

  await Linking.openURL(url);
}

export async function checkForAppUpdate() {
  const currentVersion = getInstalledVersion();
  const currentVersionCode = getInstalledBuild();

  const response = await fetch(addCacheBuster(UPDATE_METADATA_URL), {
    headers: {
      Accept: 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });

  if (!response.ok) {
    throw new Error(
      `App update check failed with status ${response.status}.`,
    );
  }

  const metadata = await response.json();

  const latestVersion = String(metadata?.version || '0.0.0');
  const latestBuild = Number(
    metadata?.android_version_code ??
      metadata?.build ??
      0,
  );

  if (!Number.isFinite(latestBuild) || latestBuild <= 0) {
    throw new Error(
      'The update information does not contain a valid build number.',
    );
  }

  pendingApkUrl =
    String(metadata?.download_url || '').trim() ||
    LATEST_APK_URL;

  const updateAvailable =
    Platform.OS === 'android' &&
    latestBuild > currentVersionCode;

  return {
    updateAvailable,
    available: updateAvailable,
    currentVersion,
    currentVersionCode,
    currentBuild: currentVersionCode,
    latestVersion,
    latestBuild,
    apkUrl: pendingApkUrl,
    apkName: metadata?.versioned_filename || metadata?.filename || 'latest.apk',
    publishedAt: metadata?.published_at || null,
    message: updateAvailable
      ? `A new app build is available.\n\nInstalled: ${currentVersion} (${currentVersionCode})\nAvailable: ${latestVersion} (${latestBuild})`
      : `You already have the latest app version.\n\nInstalled build: ${currentVersionCode}\nLatest build: ${latestBuild}`,
  };
}

export async function openLatestAppRelease() {
  await openUrl(
    addCacheBuster(pendingApkUrl || LATEST_APK_URL),
    'The latest APK download link could not be opened.',
  );
}

export async function openApkDownload(apkUrl) {
  pendingApkUrl = apkUrl || pendingApkUrl || LATEST_APK_URL;

  await openUrl(
    addCacheBuster(pendingApkUrl),
    'The APK download link could not be opened.',
  );
}

export async function applyAppUpdate() {
  await openLatestAppRelease();
}
