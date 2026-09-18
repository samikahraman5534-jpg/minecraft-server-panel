const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const axios = require('axios');
const { SERVER_DIR, ensureServerDir } = require('./configManager');

const MODS_DIR = path.join(SERVER_DIR, 'mods');

function ensureModsDir() {
  ensureServerDir();
  if (!fs.existsSync(MODS_DIR)) {
    fs.mkdirSync(MODS_DIR, { recursive: true });
  }
}

function listMods() {
  ensureModsDir();
  const entries = fs.readdirSync(MODS_DIR, { withFileTypes: true });
  const mods = [];

  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    const name = entry.name;
    const isJar = name.toLowerCase().endsWith('.jar');
    const isDisabled = name.toLowerCase().endsWith('.jar.disabled');

    if (isJar || isDisabled) {
      const fullPath = path.join(MODS_DIR, name);
      let size = 0;
      let modified = null;
      try {
        const stat = fs.statSync(fullPath);
        size = stat.size;
        modified = stat.mtime;
      } catch (e) {}

      mods.push({
        filename: name,
        displayName: name.replace(/\.jar(\.disabled)?$/i, '').replace(/[-_]/g, ' '),
        isEnabled: isJar,
        size,
        sizeFormatted: formatBytes(size),
        modified
      });
    }
  }

  return mods.sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function toggleMod(filename) {
  ensureModsDir();
  const currentPath = path.join(MODS_DIR, filename);
  if (!fs.existsSync(currentPath)) {
    throw new Error('Mod file not found.');
  }

  let newPath;
  if (filename.toLowerCase().endsWith('.disabled')) {
    newPath = currentPath.slice(0, -9); // remove .disabled
  } else {
    newPath = `${currentPath}.disabled`;
  }

  fs.renameSync(currentPath, newPath);
  return {
    oldName: filename,
    newName: path.basename(newPath),
    isEnabled: !newPath.endsWith('.disabled')
  };
}

function deleteMod(filename) {
  ensureModsDir();
  const target = path.join(MODS_DIR, filename);
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
  return true;
}

// Search Modrinth API for free & popular mods
async function searchModrinth(query = '', mcVersion = '', loader = 'forge', limit = 20) {
  try {
    const facets = [['project_type:mod']];
    if (loader) {
      facets.push([`categories:${loader.toLowerCase()}`]);
    }
    if (mcVersion) {
      facets.push([`versions:${mcVersion}`]);
    }

    const params = {
      query: query || '',
      limit,
      facets: JSON.stringify(facets),
      index: query ? 'relevance' : 'downloads'
    };

    const res = await axios.get('https://api.modrinth.com/v2/search', {
      params,
      timeout: 8000,
      headers: { 'User-Agent': 'MinecraftWebPanel/1.0 (SamiKahraman)' }
    });

    if (!res.data || !res.data.hits) return [];

    return res.data.hits.map(hit => ({
      id: hit.project_id,
      slug: hit.slug,
      title: hit.title,
      description: hit.description,
      iconUrl: hit.icon_url,
      downloads: hit.downloads,
      follows: hit.follows,
      author: hit.author,
      categories: hit.categories || [],
      versions: hit.versions || []
    }));
  } catch (err) {
    console.error('Modrinth search error:', err.message);
    throw new Error(`Modrinth arama hatası: ${err.message}`);
  }
}

// 1-Click install mod from Modrinth
async function installFromModrinth(slug, mcVersion = '', loader = 'forge') {
  ensureModsDir();
  try {
    const versionsRes = await axios.get(`https://api.modrinth.com/v2/project/${slug}/version`, {
      timeout: 8000,
      headers: { 'User-Agent': 'MinecraftWebPanel/1.0 (SamiKahraman)' }
    });

    const versions = versionsRes.data;
    if (!Array.isArray(versions) || versions.length === 0) {
      throw new Error(`Mod için uygun sürüm bulunamadı (${slug}).`);
    }

    // Filter compatible version
    let matched = versions.find(v => {
      const matchLoader = !loader || v.loaders.includes(loader.toLowerCase());
      const matchVer = !mcVersion || v.game_versions.includes(mcVersion);
      return matchLoader && matchVer;
    });

    if (!matched) {
      matched = versions.find(v => !loader || v.loaders.includes(loader.toLowerCase())) || versions[0];
    }

    const primaryFile = matched.files.find(f => f.primary) || matched.files[0];
    if (!primaryFile || !primaryFile.url) {
      throw new Error('Mod JAR indirme linki bulunamadı.');
    }

    await downloadFile(primaryFile.url, path.join(MODS_DIR, primaryFile.filename));
    return {
      success: true,
      filename: primaryFile.filename,
      versionNumber: matched.version_number
    };
  } catch (err) {
    console.error('Modrinth install error:', err.message);
    throw err;
  }
}

function downloadFile(url, targetPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(targetPath);
    const client = url.startsWith('https') ? https : http;

    const request = (targetUrl) => {
      client.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(targetPath, () => {});
          return reject(new Error(`Download failed with code ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => resolve(true));
        });
      }).on('error', (err) => {
        fs.unlink(targetPath, () => {});
        reject(err);
      });
    };

    request(url);
  });
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  MODS_DIR,
  ensureModsDir,
  listMods,
  toggleMod,
  deleteMod,
  searchModrinth,
  installFromModrinth,
  downloadFile
};
