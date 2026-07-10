import * as FileSystem from 'expo-file-system';
import bundledFord from '../data/vehicles/ford.json';
import {
  DATABASE_FOLDER_NAME,
  LOCAL_MANIFEST_NAME,
  REMOTE_MANIFEST_URL,
  REQUEST_TIMEOUT_MS,
} from '../config/databaseConfig';
import { validateManufacturerFile, validateRemoteManifest } from './schemaValidator';

const ROOT = `${FileSystem.documentDirectory}${DATABASE_FOLDER_NAME}/`;
const MANIFEST_PATH = `${ROOT}${LOCAL_MANIFEST_NAME}`;

const BUNDLED_MANUFACTURERS = {
  ford: bundledFord,
};

const BUNDLED_MANIFEST = {
  schema_version: '2.0',
  generated_at: '2026-07-10',
  manufacturers: {
    ford: { name: 'Ford', file: 'ford.json', version: 1 },
  },
};

async function ensureDirectory() {
  const info = await FileSystem.getInfoAsync(ROOT);
  if (!info.exists) await FileSystem.makeDirectoryAsync(ROOT, { intermediates: true });
}

async function readJson(path) {
  const text = await FileSystem.readAsStringAsync(path);
  return JSON.parse(text);
}

async function writeJson(path, data) {
  await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2));
}

function filePath(id) {
  return `${ROOT}${id}.json`;
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!response.ok) throw new Error(`Server returned ${response.status}.`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

function resolveFileUrl(manifestUrl, file) {
  try {
    return new URL(file, manifestUrl).toString();
  } catch {
    const base = manifestUrl.slice(0, manifestUrl.lastIndexOf('/') + 1);
    return `${base}${file}`;
  }
}

export async function initialiseDatabase() {
  await ensureDirectory();
  const manifestInfo = await FileSystem.getInfoAsync(MANIFEST_PATH);
  if (!manifestInfo.exists) {
    for (const [id, data] of Object.entries(BUNDLED_MANUFACTURERS)) {
      validateManufacturerFile(data, id);
      await writeJson(filePath(id), data);
    }
    await writeJson(MANIFEST_PATH, BUNDLED_MANIFEST);
  }
  return loadDatabase();
}

export async function loadLocalManifest() {
  await ensureDirectory();
  const info = await FileSystem.getInfoAsync(MANIFEST_PATH);
  if (!info.exists) return BUNDLED_MANIFEST;
  return readJson(MANIFEST_PATH);
}

export async function loadDatabase() {
  const manifest = await loadLocalManifest();
  const byManufacturer = {};
  for (const id of Object.keys(manifest.manufacturers || {})) {
    try {
      const data = await readJson(filePath(id));
      validateManufacturerFile(data, id);
      byManufacturer[id] = data;
    } catch (error) {
      console.warn(`Could not load ${id}:`, error.message);
    }
  }
  return { manifest, byManufacturer };
}

export async function checkForDatabaseUpdates() {
  if (REMOTE_MANIFEST_URL.includes('CHANGE-ME')) {
    throw new Error('Set REMOTE_MANIFEST_URL in config/databaseConfig.js first.');
  }
  const response = await fetchWithTimeout(`${REMOTE_MANIFEST_URL}?t=${Date.now()}`);
  const remote = await response.json();
  validateRemoteManifest(remote);
  const local = await loadLocalManifest();
  const changed = Object.entries(remote.manufacturers).filter(([id, item]) => {
    const current = local.manufacturers?.[id];
    return !current || String(current.version) !== String(item.version) ||
      (item.sha256 && current.sha256 !== item.sha256);
  });
  return { remote, changed };
}

export async function downloadDatabaseUpdates(remoteManifest, changedEntries) {
  await ensureDirectory();
  const downloaded = [];
  const tempFiles = [];

  try {
    for (const [id, entry] of changedEntries) {
      const url = resolveFileUrl(REMOTE_MANIFEST_URL, entry.file);
      const response = await fetchWithTimeout(`${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`);
      const text = await response.text();
      const parsed = JSON.parse(text);
      validateManufacturerFile(parsed, id);

      const tempPath = `${ROOT}.${id}.download.json`;
      await FileSystem.writeAsStringAsync(tempPath, JSON.stringify(parsed, null, 2));
      tempFiles.push({ id, tempPath, finalPath: filePath(id) });
    }

    // Only replace files after every changed brand has downloaded and validated.
    for (const item of tempFiles) {
      const oldInfo = await FileSystem.getInfoAsync(item.finalPath);
      if (oldInfo.exists) await FileSystem.deleteAsync(item.finalPath, { idempotent: true });
      await FileSystem.moveAsync({ from: item.tempPath, to: item.finalPath });
      downloaded.push(remoteManifest.manufacturers[item.id].name || item.id);
    }

    await writeJson(MANIFEST_PATH, remoteManifest);
    return downloaded;
  } catch (error) {
    for (const item of tempFiles) {
      await FileSystem.deleteAsync(item.tempPath, { idempotent: true }).catch(() => {});
    }
    throw error;
  }
}

export async function resetToBundledDatabase() {
  await FileSystem.deleteAsync(ROOT, { idempotent: true });
  return initialiseDatabase();
}
