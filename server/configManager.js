const fs = require('fs');
const path = require('path');

const SERVER_DIR = path.resolve(__dirname, '..', 'server_data');

function ensureServerDir() {
  if (!fs.existsSync(SERVER_DIR)) {
    fs.mkdirSync(SERVER_DIR, { recursive: true });
  }
}

function getPropertiesPath() {
  return path.join(SERVER_DIR, 'server.properties');
}

function getEulaPath() {
  return path.join(SERVER_DIR, 'eula.txt');
}

function acceptEula() {
  ensureServerDir();
  fs.writeFileSync(getEulaPath(), '# By changing the setting below to TRUE you are indicating your agreement to the EULA (https://aka.ms/MinecraftEULA).\neula=true\n', 'utf-8');
}

function getEulaStatus() {
  const p = getEulaPath();
  if (!fs.existsSync(p)) return false;
  try {
    const content = fs.readFileSync(p, 'utf-8');
    return content.toLowerCase().includes('eula=true');
  } catch {
    return false;
  }
}

function readProperties() {
  ensureServerDir();
  const p = getPropertiesPath();
  if (!fs.existsSync(p)) {
    return {};
  }
  const lines = fs.readFileSync(p, 'utf-8').split(/\r?\n/);
  const props = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.substring(0, idx).trim();
    const val = trimmed.substring(idx + 1).trim();
    props[key] = val;
  }
  return props;
}

function readRawProperties() {
  ensureServerDir();
  const p = getPropertiesPath();
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8');
}

function saveRawProperties(content) {
  ensureServerDir();
  fs.writeFileSync(getPropertiesPath(), content, 'utf-8');
}

function saveProperties(updatedProps) {
  ensureServerDir();
  const current = readProperties();
  const merged = { ...current, ...updatedProps };

  let output = '# Minecraft server properties (Managed by Web Panel)\n';
  output += `# Updated: ${new Date().toISOString()}\n`;
  for (const [key, value] of Object.entries(merged)) {
    output += `${key}=${value}\n`;
  }
  fs.writeFileSync(getPropertiesPath(), output, 'utf-8');
  return merged;
}

function readJsonFile(filename, defaultVal = []) {
  ensureServerDir();
  const p = path.join(SERVER_DIR, filename);
  if (!fs.existsSync(p)) return defaultVal;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {
    return defaultVal;
  }
}

function saveJsonFile(filename, data) {
  ensureServerDir();
  const p = path.join(SERVER_DIR, filename);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8');
}

const SETTINGS_FILE = path.resolve(__dirname, '..', 'serverSettings.json');

const DEFAULT_SYSTEM_SETTINGS = {
  minRamGb: 2,
  maxRamGb: 4,
  javaPath: 'auto',
  jvmPreset: 'aikar',
  customJvmArgs: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
  autoRestartOnCrash: false,
  autoSaveIntervalMin: 5
};

function readSystemSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
  try {
    const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
    return { ...DEFAULT_SYSTEM_SETTINGS, ...data };
  } catch {
    return { ...DEFAULT_SYSTEM_SETTINGS };
  }
}

function saveSystemSettings(settings) {
  const current = readSystemSettings();
  const merged = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');

  // Also update user_jvm_args.txt for Modern Forge
  const forgeJvmFile = path.join(SERVER_DIR, 'user_jvm_args.txt');
  try {
    const minRam = merged.minRamGb || 2;
    const maxRam = merged.maxRamGb || 4;
    const customArgs = merged.customJvmArgs || '';
    const forgeContent = `# Modern Forge JVM Args Managed by Web Panel\n-Xms${minRam}G\n-Xmx${maxRam}G\n${customArgs}\n`;
    fs.writeFileSync(forgeJvmFile, forgeContent, 'utf-8');
  } catch (e) {}

  return merged;
}

function readForgeJvmArgs() {
  ensureServerDir();
  const p = path.join(SERVER_DIR, 'user_jvm_args.txt');
  if (!fs.existsSync(p)) return '';
  return fs.readFileSync(p, 'utf-8');
}

function saveForgeJvmArgs(content) {
  ensureServerDir();
  const p = path.join(SERVER_DIR, 'user_jvm_args.txt');
  fs.writeFileSync(p, content, 'utf-8');
}

module.exports = {
  SERVER_DIR,
  ensureServerDir,
  acceptEula,
  getEulaStatus,
  readProperties,
  readRawProperties,
  saveRawProperties,
  saveProperties,
  readSystemSettings,
  saveSystemSettings,
  readForgeJvmArgs,
  saveForgeJvmArgs,
  readOps: () => readJsonFile('ops.json', []),
  saveOps: (data) => saveJsonFile('ops.json', data),
  readWhitelist: () => readJsonFile('whitelist.json', []),
  saveWhitelist: (data) => saveJsonFile('whitelist.json', data),
  readBans: () => readJsonFile('banned-players.json', []),
  saveBans: (data) => saveJsonFile('banned-players.json', data)
};
