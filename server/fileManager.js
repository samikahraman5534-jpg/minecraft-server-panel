const fs = require('fs');
const path = require('path');
const { SERVER_DIR, ensureServerDir } = require('./configManager');

function resolveSafePath(relPath = '') {
  ensureServerDir();
  const safePath = path.normalize(path.join(SERVER_DIR, relPath));
  if (!safePath.startsWith(SERVER_DIR)) {
    throw new Error('Access denied: Cannot navigate outside server directory.');
  }
  return safePath;
}

function listFiles(relPath = '') {
  const targetDir = resolveSafePath(relPath);
  if (!fs.existsSync(targetDir)) {
    return [];
  }

  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  return entries.map(entry => {
    const fullPath = path.join(targetDir, entry.name);
    let size = 0;
    let modified = null;
    try {
      const stat = fs.statSync(fullPath);
      size = stat.size;
      modified = stat.mtime;
    } catch (e) {}

    return {
      name: entry.name,
      path: path.relative(SERVER_DIR, fullPath).replace(/\\/g, '/'),
      isDirectory: entry.isDirectory(),
      size,
      sizeFormatted: entry.isDirectory() ? '-' : formatBytes(size),
      modified
    };
  }).sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;
    return a.name.localeCompare(b.name);
  });
}

function readFileContent(relPath) {
  const targetFile = resolveSafePath(relPath);
  if (!fs.existsSync(targetFile)) {
    throw new Error('File not found.');
  }
  const stat = fs.statSync(targetFile);
  if (stat.size > 5 * 1024 * 1024) {
    throw new Error('File is too large to open in web editor (max 5MB).');
  }
  return fs.readFileSync(targetFile, 'utf-8');
}

function saveFileContent(relPath, content) {
  const targetFile = resolveSafePath(relPath);
  fs.writeFileSync(targetFile, content, 'utf-8');
  return true;
}

function deleteFileOrFolder(relPath) {
  const target = resolveSafePath(relPath);
  if (!fs.existsSync(target)) {
    return true;
  }
  const stat = fs.statSync(target);
  if (stat.isDirectory()) {
    fs.rmSync(target, { recursive: true, force: true });
  } else {
    fs.unlinkSync(target);
  }
  return true;
}

function createFolder(relPath, folderName) {
  const target = resolveSafePath(path.join(relPath, folderName));
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
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
  resolveSafePath,
  listFiles,
  readFileContent,
  saveFileContent,
  deleteFileOrFolder,
  createFolder
};
