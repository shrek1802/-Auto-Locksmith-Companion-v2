import {
  Linking,
  Platform,
} from 'react-native';

import appConfig from '../app.json';

const GITHUB_OWNER = 'shrek1802';
const GITHUB_REPOSITORY = '-Auto-Locksmith-Companion-v2';

const RELEASES_API_URL =
  `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/latest`;

const RELEASES_PAGE_URL =
  `https://github.com/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/releases/latest`;

export async function checkForAppUpdate() {
  const currentVersion =
    appConfig?.expo?.version || '0.0.0';

  const currentVersionCode =
    Platform.OS === 'android'
      ? Number(appConfig?.expo?.android?.versionCode || 0)
      : Number(appConfig?.expo?.ios?.buildNumber || 0);

  const response = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      'Cache-Control': 'no-cache',
      'User-Agent': 'Locksmith-Companion-Pro',
    },
  });

  if (response.status === 404) {
    return {
      updateAvailable: false,
      currentVersion,
      currentVersionCode,
      latestVersion: null,
      message: 'No app releases have been published yet.',
    };
  }

  if (!response.ok) {
    throw new Error(
      `GitHub update check failed with status ${response.status}.`
    );
  }

  const release = await response.json();

  if (!release || release.draft) {
    return {
      updateAvailable: false,
      currentVersion,
      currentVersionCode,
      latestVersion: null,
      message: 'No public app release is available.',
    };
  }

  const latestVersion =
    cleanVersion(
      release.tag_name ||
      release.name ||
      '0.0.0'
    );

  const updateAvailable =
    compareVersions(
      latestVersion,
      currentVersion
    ) > 0;

  const apkAsset =
    Array.isArray(release.assets)
      ? release.assets.find((asset) =>
          String(asset?.name || '')
            .toLowerCase()
            .endsWith('.apk')
        )
      : null;

  return {
    updateAvailable,
    currentVersion,
    currentVersionCode,
    latestVersion,
    releaseName:
      release.name ||
      release.tag_name ||
      latestVersion,
    releaseNotes:
      release.body || '',
    publishedAt:
      release.published_at || null,
    releaseUrl:
      release.html_url ||
      RELEASES_PAGE_URL,
    apkUrl:
      apkAsset?.browser_download_url || null,
    apkName:
      apkAsset?.name || null,
    message: updateAvailable
      ? `Version ${latestVersion} is available.`
      : 'You already have the latest app version.',
  };
}

export async function openLatestAppRelease() {
  const supported =
    await Linking.canOpenURL(
      RELEASES_PAGE_URL
    );

  if (!supported) {
    throw new Error(
      'The GitHub release page could not be opened.'
    );
  }

  await Linking.openURL(
    RELEASES_PAGE_URL
  );
}

export async function openApkDownload(
  apkUrl
) {
  if (!apkUrl) {
    await openLatestAppRelease();
    return;
  }

  const supported =
    await Linking.canOpenURL(apkUrl);

  if (!supported) {
    throw new Error(
      'The APK download link could not be opened.'
    );
  }

  await Linking.openURL(apkUrl);
}

function cleanVersion(value) {
  const match = String(value || '')
    .trim()
    .match(/(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return '0.0.0';
  }

  return `${Number(match[1])}.${Number(match[2])}.${Number(match[3])}`;
}

function compareVersions(
  firstVersion,
  secondVersion
) {
  const firstParts =
    cleanVersion(firstVersion)
      .split('.')
      .map(Number);

  const secondParts =
    cleanVersion(secondVersion)
      .split('.')
      .map(Number);

  for (let index = 0; index < 3; index += 1) {
    const first =
      firstParts[index] || 0;

    const second =
      secondParts[index] || 0;

    if (first > second) {
      return 1;
    }

    if (first < second) {
      return -1;
    }
  }

  return 0;
}
