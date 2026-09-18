const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const archiver = require('archiver');
const { SERVER_DIR, ensureServerDir, readProperties, saveProperties } = require('./configManager');

function getActiveWorldName() {
  const props = readProperties();
  return props['level-name'] || 'world';
}

function listWorlds() {
  ensureServerDir();
  const activeName = getActiveWorldName();
  const entries = fs.readdirSync(SERVER_DIR, { withFileTypes: true });
  const worlds = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    // Exclude system directories
    if (['logs', 'plugins', 'mods', 'cache', 'libraries', 'config', 'defaultconfigs', 'versions'].includes(name.toLowerCase())) {
      continue;
    }

    const fullPath = path.join(SERVER_DIR, name);
    const hasLevelDat = fs.existsSync(path.join(fullPath, 'level.dat'));
    const hasRegion = fs.existsSync(path.join(fullPath, 'region')) || fs.existsSync(path.join(fullPath, 'DIM-1')) || fs.existsSync(path.join(fullPath, 'DIM1'));

    // If it has level.dat or region, or is the current active level-name
    if (hasLevelDat || hasRegion || name === activeName) {
      let size = 0;
      let modified = null;
      try {
        const stat = fs.statSync(fullPath);
        modified = stat.mtime;
        size = getDirSize(fullPath);
      } catch (e) {}

      worlds.push({
        name,
        isActive: name === activeName,
        hasLevelDat,
        size,
        sizeFormatted: formatBytes(size),
        modified
      });
    }
  }

  // If no worlds found but active world is defined, include placeholder
  if (worlds.length === 0) {
    worlds.push({
      name: activeName,
      isActive: true,
      hasLevelDat: false,
      size: 0,
      sizeFormatted: '0 B',
      modified: new Date()
    });
  }

  return worlds.sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0));
}

function setActiveWorld(worldName) {
  ensureServerDir();
  const safeName = worldName.replace(/[^a-zA-Z0-9_\-]/g, '_');
  saveProperties({ 'level-name': safeName });
  return { success: true, activeWorld: safeName };
}

function createWorld(options = {}) {
  ensureServerDir();
  const {
    name = 'new_world',
    seed = '',
    levelType = 'minecraft:normal',
    generateStructures = 'true',
    difficulty = 'normal'
  } = options;

  const safeName = name.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const targetDir = path.join(SERVER_DIR, safeName);

  if (fs.existsSync(targetDir)) {
    throw new Error(`"${safeName}" isimli bir dünya klasörü zaten mevcut.`);
  }

  // Update server.properties to point to new world
  saveProperties({
    'level-name': safeName,
    'level-seed': seed,
    'level-type': levelType,
    'generate-structures': generateStructures,
    'difficulty': difficulty
  });

  return { success: true, worldName: safeName };
}

function uploadWorldZip(zipFilePath, worldName) {
  ensureServerDir();
  const safeName = worldName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const destDir = path.join(SERVER_DIR, safeName);

  if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
  }
  fs.mkdirSync(destDir, { recursive: true });

  const zip = new AdmZip(zipFilePath);
  const zipEntries = zip.getEntries();

  // Find if level.dat is in a nested subfolder
  let rootPrefix = '';
  for (const entry of zipEntries) {
    if (entry.entryName.toLowerCase().endsWith('level.dat')) {
      const idx = entry.entryName.lastIndexOf('level.dat');
      rootPrefix = entry.entryName.substring(0, idx);
      break;
    }
  }

  if (rootPrefix) {
    // Extract entries under rootPrefix
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith(rootPrefix)) {
        const relPath = entry.entryName.substring(rootPrefix.length);
        if (!relPath) continue;
        const targetPath = path.join(destDir, relPath);
        if (entry.isDirectory) {
          fs.mkdirSync(targetPath, { recursive: true });
        } else {
          fs.mkdirSync(path.dirname(targetPath), { recursive: true });
          fs.writeFileSync(targetPath, entry.getData());
        }
      }
    }
  } else {
    zip.extractAllTo(destDir, true);
  }

  return { success: true, worldName: safeName };
}

function cloneWorld(sourceName, targetName) {
  ensureServerDir();
  const safeTarget = targetName.trim().replace(/[^a-zA-Z0-9_\-]/g, '_');
  const src = path.join(SERVER_DIR, sourceName);
  const dst = path.join(SERVER_DIR, safeTarget);

  if (!fs.existsSync(src)) {
    throw new Error('Kaynak dünya bulunamadı.');
  }
  if (fs.existsSync(dst)) {
    throw new Error('Hedef dünya adı zaten kullanımda.');
  }

  fs.cpSync(src, dst, { recursive: true });
  return { success: true, clonedName: safeTarget };
}

function deleteWorld(worldName) {
  ensureServerDir();
  const active = getActiveWorldName();
  if (worldName === active) {
    throw new Error('Aktif olan dünya silinemez! Önce başka bir dünyayı aktif yapın.');
  }

  const target = path.join(SERVER_DIR, worldName);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  return { success: true };
}

function exportWorldZip(worldName, res) {
  ensureServerDir();
  const targetDir = path.join(SERVER_DIR, worldName);
  if (!fs.existsSync(targetDir)) {
    throw new Error('Dünya klasörü bulunamadı.');
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${worldName}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(res);
  archive.directory(targetDir, worldName);
  archive.finalize();
}

function getDirSize(dir) {
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirSize(full);
      } else {
        const s = fs.statSync(full);
        size += s.size;
      }
    }
  } catch (e) {}
  return size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  getActiveWorldName,
  listWorlds,
  setActiveWorld,
  createWorld,
  uploadWorldZip,
  cloneWorld,
  deleteWorld,
  exportWorldZip
};
