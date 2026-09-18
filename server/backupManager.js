const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { SERVER_DIR } = require('./configManager');

const BACKUPS_DIR = path.resolve(__dirname, '..', 'backups');

function ensureBackupsDir() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
  }
}

function listBackups() {
  ensureBackupsDir();
  const files = fs.readdirSync(BACKUPS_DIR);
  const backups = [];

  for (const file of files) {
    if (!file.endsWith('.zip')) continue;
    const fullPath = path.join(BACKUPS_DIR, file);
    try {
      const stat = fs.statSync(fullPath);
      backups.push({
        name: file,
        size: stat.size,
        sizeFormatted: formatBytes(stat.size),
        createdAt: stat.mtime
      });
    } catch (e) {}
  }

  return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function createBackup(namePrefix = 'backup') {
  return new Promise((resolve, reject) => {
    ensureBackupsDir();
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${namePrefix}_${timestamp}.zip`;
    const outputPath = path.join(BACKUPS_DIR, filename);

    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      resolve({
        name: filename,
        size: archive.pointer(),
        sizeFormatted: formatBytes(archive.pointer())
      });
    });

    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    // Archive server world directories or key files
    const worldDirs = ['world', 'world_nether', 'world_the_end'];
    let includedAny = false;

    for (const wd of worldDirs) {
      const fullWd = path.join(SERVER_DIR, wd);
      if (fs.existsSync(fullWd)) {
        archive.directory(fullWd, wd);
        includedAny = true;
      }
    }

    // Also include config files
    const configFiles = ['server.properties', 'ops.json', 'whitelist.json', 'banned-players.json', 'bukkit.yml', 'spigot.yml', 'paper.yml', 'purpur.yml'];
    for (const cf of configFiles) {
      const fullCf = path.join(SERVER_DIR, cf);
      if (fs.existsSync(fullCf)) {
        archive.file(fullCf, { name: cf });
      }
    }

    // If no world dir exists yet, backup the whole server directory excluding logs
    if (!includedAny && fs.existsSync(SERVER_DIR)) {
      archive.glob('**/*', {
        cwd: SERVER_DIR,
        ignore: ['logs/**', 'cache/**', '*.log']
      });
    }

    archive.finalize();
  });
}

function restoreBackup(filename) {
  ensureBackupsDir();
  const zipPath = path.join(BACKUPS_DIR, filename);
  if (!fs.existsSync(zipPath)) {
    throw new Error('Backup file not found.');
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(SERVER_DIR, true);
  return true;
}

function deleteBackup(filename) {
  ensureBackupsDir();
  const zipPath = path.join(BACKUPS_DIR, filename);
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  return true;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  BACKUPS_DIR,
  listBackups,
  createBackup,
  restoreBackup,
  deleteBackup
};
