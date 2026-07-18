const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const vehiclesDir = path.join(root, 'data', 'vehicles');
const masterDir = path.join(root, 'data', 'master');
const configFile = path.join(root, 'config', 'databaseConfig.js');
const serviceFile = path.join(root, 'services', 'DatabaseService.js');
const vehicleScreenFile = path.join(root, 'screens', 'VehicleScreen.js');
const quickJobFile = path.join(root, 'components', 'QuickJobCard.js');
const adapterFile = path.join(root, 'services', 'vehicleDisplayAdapter.js');

let failed = false;
let warnings = 0;
let jsonChecked = 0;

const pass = (message) => console.log(`PASS: ${message}`);
const warn = (message) => {
  warnings += 1;
  console.warn(`WARNING: ${message}`);
};
const fail = (message) => {
  failed = true;
  console.error(`FAIL: ${message}`);
};

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function validateJson(file) {
  try {
    JSON.parse(read(file));
    jsonChecked += 1;
    pass(`${path.relative(root, file)} is valid JSON`);
  } catch (error) {
    fail(`${path.relative(root, file)} is invalid JSON: ${error.message}`);
  }
}

console.log('\nRemote-only app data validation\n');

if (!fs.existsSync(vehiclesDir)) {
  pass('data/vehicles is absent as expected');
} else {
  const jsonFiles = fs.readdirSync(vehiclesDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => entry.name);

  if (jsonFiles.length) {
    fail(`Bundled vehicle files still exist: ${jsonFiles.join(', ')}`);
  } else {
    pass('data/vehicles contains no bundled JSON files');
  }
}

if (fs.existsSync(masterDir)) {
  const masterFiles = fs.readdirSync(masterDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(masterDir, entry.name));

  if (!masterFiles.length) {
    warn('data/master exists but contains no JSON files');
  }

  masterFiles.forEach(validateJson);
} else {
  pass('No local data/master folder found');
}

if (!fs.existsSync(configFile)) {
  fail('config/databaseConfig.js is missing');
} else {
  const config = read(configFile);

  if (config.includes('locksmith-companion-database/main/manifest.json')) {
    pass('Remote database manifest URL is configured');
  } else {
    fail('Remote database manifest URL is missing or incorrect');
  }

  if (/BUNDLED_DATABASES\s*=\s*\{\s*\}/m.test(config)) {
    pass('BUNDLED_DATABASES is empty');
  } else {
    fail('BUNDLED_DATABASES must be empty');
  }

  if (/manufacturers\s*:\s*\{\s*\}/m.test(config)) {
    pass('Bundled manufacturers list is empty');
  } else {
    fail('Bundled manufacturers list must be empty');
  }
}

if (!fs.existsSync(serviceFile)) {
  fail('services/DatabaseService.js is missing');
} else {
  const service = read(serviceFile);

  if (
    service.includes('data/vehicles/ford.json') ||
    service.includes('bundledFord')
  ) {
    fail('DatabaseService still references bundled Ford data');
  } else {
    pass('DatabaseService has no bundled Ford reference');
  }

  if (service.includes('REMOTE_MANIFEST_URL')) {
    pass('DatabaseService uses the remote manifest');
  } else {
    fail('DatabaseService does not use REMOTE_MANIFEST_URL');
  }
}

const structuredFields = [
  'blade_profile',
  'transponder_id',
  'technology_family',
  'chip_type',
  'chip_ic',
  'remote_configuration',
  'frequency',
];

for (const file of [vehicleScreenFile, quickJobFile, adapterFile]) {
  if (!fs.existsSync(file)) {
    fail(`${path.relative(root, file)} is missing`);
    continue;
  }
  const source = read(file);
  const missing = structuredFields.filter((field) => !source.includes(field));
  if (missing.length) {
    fail(`${path.relative(root, file)} lacks structured key fields: ${missing.join(', ')}`);
  } else {
    pass(`${path.relative(root, file)} supports structured key fields`);
  }
}

if (fs.existsSync(quickJobFile)) {
  const quickJob = read(quickJobFile);
  if (/function\s+formatTransponder|NXP PCF7946 \/ HITAG2 ID46/.test(quickJob)) {
    fail('QuickJobCard still infers an exact IC from a transponder family');
  } else {
    pass('QuickJobCard does not infer exact ICs from transponder families');
  }
}

if (fs.existsSync(vehicleScreenFile)) {
  const vehicleScreen = read(vehicleScreenFile);
  const labels = ['Blade', 'Transponder', 'Technology', 'Chip Type', 'Chip IC', 'Remote', 'Frequency'];
  const positions = labels.map((label) => vehicleScreen.indexOf(`label="${label}"`));
  const ordered = positions.every((position, index) => position >= 0 && (index === 0 || position > positions[index - 1]));
  if (ordered) {
    pass('VehicleScreen renders the structured key profile in locksmith order');
  } else {
    fail('VehicleScreen structured key profile order is incorrect');
  }
}

console.log('\nSummary');
console.log(`Shared JSON checked: ${jsonChecked}`);
console.log(`Warnings: ${warnings}`);
console.log(`Result: ${failed ? 'FAILED' : 'PASSED'}\n`);

process.exit(failed ? 1 : 0);
