const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const WebSocket = require('ws');
const multer = require('multer');

const mcProcess = require('./minecraftProcess');
const playitManager = require('./playitProcess');
const installer = require('./installer');
const configManager = require('./configManager');
const fileManager = require('./fileManager');
const backupManager = require('./backupManager');
const modManager = require('./modManager');
const worldManager = require('./worldManager');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.resolve(__dirname, '..', 'public')));
app.get('/favicon.ico', (req, res) => res.sendFile(path.resolve(__dirname, '..', 'public', 'assets', 'favicon.svg')));

// Multer storage for general file / plugin uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadRelPath = req.query.path || '';
    try {
      const dest = fileManager.resolveSafePath(uploadRelPath);
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      cb(null, dest);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Multer storage for mods
const modStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    modManager.ensureModsDir();
    cb(null, modManager.MODS_DIR);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const uploadMod = multer({ storage: modStorage });

// Multer storage for world zip uploads
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.resolve(__dirname, '..', 'backups', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `upload_${Date.now()}_${file.originalname}`);
  }
});
const uploadZip = multer({ storage: tempStorage });

// WebSocket broadcasting helper
function broadcast(type, data) {
  const payload = JSON.stringify({ type, data });
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Attach listeners to process managers
mcProcess.addListener((event, data) => {
  if (event === 'log') broadcast('mc_log', data);
  else if (event === 'status') broadcast('mc_status', data);
  else if (event === 'stats') broadcast('mc_stats', data);
  else if (event === 'players_changed') broadcast('mc_players', data);
});

playitManager.addListener((event, data) => {
  if (event === 'log') broadcast('playit_log', data);
  else if (event === 'status') broadcast('playit_status', data);
  else if (event === 'claim_url') broadcast('playit_claim_url', data);
  else if (event === 'tunnel_found') broadcast('playit_tunnel', data);
  else if (event === 'download_progress') broadcast('playit_download_progress', data);
});

installer.addListener((event, data) => {
  if (event === 'progress') broadcast('installer_progress', data);
  else if (event === 'complete') broadcast('installer_complete', data);
  else if (event === 'error') broadcast('installer_error', data);
});

// WebSocket connection handling
wss.on('connection', (ws) => {
  ws.send(JSON.stringify({
    type: 'init',
    data: {
      server: mcProcess.getStatus(),
      playit: playitManager.getStatus(),
      javas: mcProcess.getDetectedJavas(),
      jarInfo: installer.getServerJarInfo()
    }
  }));

  ws.on('message', (msgStr) => {
    try {
      const msg = JSON.parse(msgStr);
      if (msg.type === 'command' && msg.command) {
        mcProcess.sendCommand(msg.command);
      }
    } catch (e) {}
  });
});

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// General Status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    server: mcProcess.getStatus(),
    playit: playitManager.getStatus(),
    javas: mcProcess.getDetectedJavas(),
    jarInfo: installer.getServerJarInfo()
  });
});

// Java Paths
app.get('/api/system/javas', (req, res) => {
  res.json({
    success: true,
    javas: mcProcess.getDetectedJavas()
  });
});

// Minecraft Server Controls
app.post('/api/server/start', async (req, res) => {
  try {
    const { javaPath, maxRamGb, minRamGb } = req.body;
    await mcProcess.start({ javaPath, maxRamGb, minRamGb });
    
    // Auto-start Playit tunnel seamlessly in background if not already running
    if (!playitManager.process && playitManager.status !== 'RUNNING' && playitManager.status !== 'STARTING') {
      playitManager.start().catch(err => {
        console.log('[Auto-Playit] Tunnel background start note:', err.message);
      });
    }
    
    res.json({ success: true, message: 'Minecraft sunucusu başlatılıyor...' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/server/stop', async (req, res) => {
  try {
    await mcProcess.stop();
    res.json({ success: true, message: 'Durdurma sinyali gönderildi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/server/restart', async (req, res) => {
  try {
    await mcProcess.restart();
    res.json({ success: true, message: 'Sunucu yeniden başlatılıyor...' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/server/kill', (req, res) => {
  try {
    mcProcess.kill();
    res.json({ success: true, message: 'Sunucu zorla kapatıldı.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/server/command', (req, res) => {
  try {
    const { command } = req.body;
    if (!command) throw new Error('Komut boş olamaz.');
    mcProcess.sendCommand(command);
    res.json({ success: true, message: 'Komut uygulandı.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Playit.gg Controls
app.get('/api/playit/status', (req, res) => {
  res.json({ success: true, playit: playitManager.getStatus() });
});

app.post('/api/playit/download', async (req, res) => {
  try {
    await playitManager.download();
    res.json({ success: true, message: 'Playit.exe indirildi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/playit/start', async (req, res) => {
  try {
    await playitManager.start();
    res.json({ success: true, message: 'Playit tüneli başlatıldı.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/playit/stop', async (req, res) => {
  try {
    await playitManager.stop();
    res.json({ success: true, message: 'Playit tüneli durduruldu.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/playit/reset', async (req, res) => {
  try {
    await playitManager.resetSecret();
    res.json({ success: true, message: 'Playit kimlik bilgileri sıfırlandı.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/playit/domain', (req, res) => {
  try {
    const { domain } = req.body;
    if (!domain) throw new Error('Domain gereklidir.');
    playitManager.setCustomDomain(domain);
    res.json({ success: true, message: `Playit domaini "${domain}" olarak ayarlandı.`, publicAddress: domain });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Server Version Installer
app.get('/api/installer/versions', async (req, res) => {
  try {
    const purpur = await installer.getPurpurVersions();
    const forge = await installer.getForgeVersions();
    const vanilla = await installer.getVanillaVersions();
    res.json({
      success: true,
      purpur,
      forge,
      vanilla: vanilla.map(v => v.id)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/installer/install', async (req, res) => {
  try {
    const { type = 'purpur', version, javaPath } = req.body;
    if (!version) throw new Error('Sürüm belirtilmelidir.');

    if (mcProcess.status !== 'OFFLINE') {
      throw new Error('Lütfen yeni bir sürüm yüklemeden önce sunucuyu durdurun.');
    }

    if (type === 'purpur') {
      installer.installPurpur(version);
    } else if (type === 'forge') {
      installer.installForge(version, javaPath || mcProcess.selectedJava);
    } else if (type === 'fabric') {
      installer.installFabric(version);
    } else if (type === 'vanilla') {
      installer.installVanilla(version);
    } else {
      throw new Error('Desteklenmeyen sunucu tipi.');
    }

    res.json({ success: true, message: `${type.toUpperCase()} ${version} kurulumu başlatıldı.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Mod Management Endpoints
// -------------------------------------------------------------
app.get('/api/mods/list', (req, res) => {
  try {
    const mods = modManager.listMods();
    res.json({ success: true, mods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mods/toggle', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) throw new Error('Filename is required.');
    const result = modManager.toggleMod(filename);
    res.json({ success: true, result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/mods/delete', (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) throw new Error('Filename is required.');
    modManager.deleteMod(filename);
    res.json({ success: true, message: 'Mod silindi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/mods/search', async (req, res) => {
  try {
    const { query, mcVersion, loader = 'forge' } = req.query;
    const results = await modManager.searchModrinth(query, mcVersion, loader);
    res.json({ success: true, hits: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/mods/install-modrinth', async (req, res) => {
  try {
    const { slug, mcVersion, loader = 'forge' } = req.body;
    if (!slug) throw new Error('Mod slug is required.');
    const result = await modManager.installFromModrinth(slug, mcVersion, loader);
    res.json({ success: true, result, message: `${result.filename} başarıyla kuruldu!` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/mods/upload', uploadMod.array('mods'), (req, res) => {
  try {
    res.json({ success: true, count: req.files?.length || 0, message: 'Modlar başarıyla yüklendi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// World Management Endpoints
// -------------------------------------------------------------
app.get('/api/worlds/list', (req, res) => {
  try {
    const worlds = worldManager.listWorlds();
    res.json({
      success: true,
      worlds,
      activeWorld: worldManager.getActiveWorldName()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/worlds/set-active', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error('World name is required.');
    const result = worldManager.setActiveWorld(name);
    res.json({ success: true, result, message: `"${name}" aktif dünya olarak ayarlandı.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/worlds/create', (req, res) => {
  try {
    const result = worldManager.createWorld(req.body);
    res.json({ success: true, result, message: `"${result.worldName}" dünyası oluşturuldu ve aktif yapıldı.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/worlds/clone', (req, res) => {
  try {
    const { source, target } = req.body;
    if (!source || !target) throw new Error('Source and target world names are required.');
    const result = worldManager.cloneWorld(source, target);
    res.json({ success: true, result, message: `Dünya başarıyla "${result.clonedName}" olarak klonlandı.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/worlds/delete', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error('World name is required.');
    worldManager.deleteWorld(name);
    res.json({ success: true, message: `"${name}" dünyası silindi.` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/worlds/download/:name', (req, res) => {
  try {
    worldManager.exportWorldZip(req.params.name, res);
  } catch (err) {
    res.status(400).send(`Dünya indirilemedi: ${err.message}`);
  }
});

app.post('/api/worlds/upload', uploadZip.single('worldZip'), (req, res) => {
  try {
    if (!req.file) throw new Error('Lütfen bir .zip harita dosyası seçin.');
    const worldName = req.body.worldName || req.file.originalname.replace(/\.zip$/i, '');
    const result = worldManager.uploadWorldZip(req.file.path, worldName);

    // Clean temp zip
    try { fs.unlinkSync(req.file.path); } catch (e) {}

    res.json({ success: true, result, message: `"${result.worldName}" haritası başarıyla yüklendi!` });
  } catch (err) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// Config & Properties
// -------------------------------------------------------------
app.get('/api/config/properties', (req, res) => {
  try {
    const props = configManager.readProperties();
    res.json({ success: true, properties: props });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/properties', (req, res) => {
  try {
    const updated = configManager.saveProperties(req.body.properties || {});
    res.json({ success: true, properties: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/config/properties/raw', (req, res) => {
  try {
    const raw = configManager.readRawProperties();
    res.json({ success: true, raw });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/properties/raw', (req, res) => {
  try {
    configManager.saveRawProperties(req.body.content || '');
    res.json({ success: true, message: 'Properties saved successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// System & RAM Settings
app.get('/api/config/system', (req, res) => {
  try {
    const settings = configManager.readSystemSettings();
    res.json({ success: true, settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/system', (req, res) => {
  try {
    const saved = configManager.saveSystemSettings(req.body);
    res.json({ success: true, settings: saved, message: 'RAM ve sistem ayarları kaydedildi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/config/forge-jvm', (req, res) => {
  try {
    const content = configManager.readForgeJvmArgs();
    res.json({ success: true, content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/config/forge-jvm', (req, res) => {
  try {
    configManager.saveForgeJvmArgs(req.body.content || '');
    res.json({ success: true, message: 'user_jvm_args.txt dosyası kaydedildi.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Player Configs
app.get('/api/config/players', (req, res) => {
  try {
    res.json({
      success: true,
      ops: configManager.readOps(),
      whitelist: configManager.readWhitelist(),
      bans: configManager.readBans(),
      onlinePlayers: Array.from(mcProcess.onlinePlayers)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// File Management
app.get('/api/files/list', (req, res) => {
  try {
    const relPath = req.query.path || '';
    const files = fileManager.listFiles(relPath);
    res.json({ success: true, files, currentPath: relPath });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/files/read', (req, res) => {
  try {
    const relPath = req.query.path;
    if (!relPath) throw new Error('Path is required.');
    const content = fileManager.readFileContent(relPath);
    res.json({ success: true, content });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/files/save', (req, res) => {
  try {
    const { path: relPath, content } = req.body;
    if (!relPath) throw new Error('Path is required.');
    fileManager.saveFileContent(relPath, content);
    res.json({ success: true, message: 'File saved successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/files/delete', (req, res) => {
  try {
    const { path: relPath } = req.body;
    if (!relPath) throw new Error('Path is required.');
    fileManager.deleteFileOrFolder(relPath);
    res.json({ success: true, message: 'Deleted successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/files/folder', (req, res) => {
  try {
    const { path: relPath = '', folderName } = req.body;
    if (!folderName) throw new Error('Folder name is required.');
    fileManager.createFolder(relPath, folderName);
    res.json({ success: true, message: 'Folder created.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/files/upload', upload.array('files'), (req, res) => {
  try {
    res.json({ success: true, count: req.files?.length || 0, message: 'Files uploaded successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// World Backups
app.get('/api/backups/list', (req, res) => {
  try {
    const backups = backupManager.listBackups();
    res.json({ success: true, backups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backups/create', async (req, res) => {
  try {
    const { namePrefix = 'world_backup' } = req.body;
    const backup = await backupManager.createBackup(namePrefix);
    res.json({ success: true, backup, message: 'Backup created successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/backups/restore', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error('Backup name is required.');
    if (mcProcess.status !== 'OFFLINE') {
      throw new Error('Lütfen bir yedeği geri yüklemeden önce sunucuyu durdurun.');
    }
    backupManager.restoreBackup(name);
    res.json({ success: true, message: 'Backup restored successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/backups/delete', (req, res) => {
  try {
    const { name } = req.body;
    if (!name) throw new Error('Backup name is required.');
    backupManager.deleteBackup(name);
    res.json({ success: true, message: 'Backup deleted.' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/backups/download/:name', (req, res) => {
  try {
    const filename = path.basename(req.params.name);
    const fullPath = path.join(backupManager.BACKUPS_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).send('Backup not found');
    }
    res.download(fullPath);
  } catch (err) {
    res.status(500).send('Error downloading backup');
  }
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Minecraft Web Panel running at: http://localhost:${PORT}`);
  console.log(`🧩 Forge, Mod & World Management enabled.`);
  if (playitManager.customDomain) {
    console.log(`🌐 Playit.gg domain: ${playitManager.customDomain}`);
  } else {
    console.log(`🌐 Playit.gg: Hazır (Panelden veya sistem Playit'inden yönetilebilir)`);
  }
  console.log(`====================================================`);
});
