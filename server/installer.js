const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { spawn } = require('child_process');
const axios = require('axios');
const { SERVER_DIR, ensureServerDir, acceptEula, saveProperties } = require('./configManager');

const SERVER_JAR_PATH = path.join(SERVER_DIR, 'server.jar');

class ServerInstaller {
  constructor() {
    this.isInstalling = false;
    this.progress = 0;
    this.statusMessage = '';
    this.listeners = new Set();
  }

  addListener(fn) {
    this.listeners.add(fn);
  }

  removeListener(fn) {
    this.listeners.delete(fn);
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (err) {
        console.error('Installer listener error:', err);
      }
    }
  }

  async getPurpurVersions() {
    try {
      const res = await axios.get('https://api.purpurmc.org/v2/purpur', { timeout: 8000 });
      if (res.data && Array.isArray(res.data.versions)) {
        return res.data.versions.reverse();
      }
    } catch (err) {
      console.warn('Purpur version fetch failed, using fallback list');
    }
    return ['1.21.4', '1.21.1', '1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.18.2', '1.16.5', '1.12.2'];
  }

  async getForgeVersions() {
    try {
      const res = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 8000 });
      if (res.data && res.data.promos) {
        const promos = res.data.promos;
        const mcVers = new Set();
        for (const key of Object.keys(promos)) {
          const match = key.match(/^([0-9.]+)-(latest|recommended)$/);
          if (match) {
            mcVers.add(match[1]);
          }
        }
        return Array.from(mcVers).reverse();
      }
    } catch (err) {
      console.warn('Forge version fetch failed, using fallback list');
    }
    return ['1.20.4', '1.20.2', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2', '1.7.10'];
  }

  async getVanillaVersions() {
    try {
      const res = await axios.get('https://piston-meta.mojang.com/mc/game/version_manifest_v2.json', { timeout: 8000 });
      if (res.data && Array.isArray(res.data.versions)) {
        return res.data.versions
          .filter(v => v.type === 'release')
          .map(v => ({ id: v.id, url: v.url }));
      }
    } catch (err) {}
    return [
      { id: '1.21.4', url: '' },
      { id: '1.20.4', url: '' },
      { id: '1.16.5', url: '' }
    ];
  }

  async installPurpur(version) {
    const downloadUrl = `https://api.purpurmc.org/v2/purpur/${version}/latest/download`;
    return this.downloadJar(downloadUrl, `Purpur ${version}`);
  }

  async installVanilla(version) {
    const versions = await this.getVanillaVersions();
    const target = versions.find(v => v.id === version);
    if (!target || !target.url) {
      throw new Error(`Vanilla version ${version} details not found.`);
    }
    const metaRes = await axios.get(target.url, { timeout: 8000 });
    const downloadUrl = metaRes.data?.downloads?.server?.url;
    if (!downloadUrl) {
      throw new Error(`Vanilla download URL not found for ${version}`);
    }
    return this.downloadJar(downloadUrl, `Vanilla ${version}`);
  }

  async installFabric(version) {
    // Get Fabric meta
    const loaderRes = await axios.get(`https://meta.fabricmc.net/v2/versions/loader/${version}`, { timeout: 8000 });
    const loaders = loaderRes.data;
    if (!loaders || loaders.length === 0) {
      throw new Error(`Fabric loader not found for Minecraft ${version}`);
    }
    const loaderVer = loaders[0].loader.version;
    const installerVer = '1.0.1';
    const downloadUrl = `https://meta.fabricmc.net/v2/versions/loader/${version}/${loaderVer}/${installerVer}/server/jar`;
    return this.downloadJar(downloadUrl, `Fabric ${version}`);
  }

  async installForge(version, javaPath = 'java') {
    ensureServerDir();
    this.isInstalling = true;
    this.progress = 10;
    this.statusMessage = `Forge ${version} versiyon bilgisi alınıyor...`;
    this.emit('progress', { progress: 10, status: this.statusMessage });

    // 1. Get Forge build version from promos
    let forgeBuild = '';
    try {
      const res = await axios.get('https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json', { timeout: 8000 });
      const promos = res.data?.promos || {};
      forgeBuild = promos[`${version}-recommended`] || promos[`${version}-latest`];
    } catch (e) {}

    if (!forgeBuild) {
      const fallbackBuilds = {
        '1.20.4': '49.2.0',
        '1.20.1': '47.4.10',
        '1.19.4': '45.4.0',
        '1.19.2': '43.5.0',
        '1.18.2': '40.3.0',
        '1.16.5': '36.2.34',
        '1.12.2': '14.23.5.2859'
      };
      forgeBuild = fallbackBuilds[version] || 'latest';
    }

    const installerFileName = `forge-${version}-${forgeBuild}-installer.jar`;
    const installerUrl = `https://maven.minecraftforge.net/net/minecraftforge/forge/${version}-${forgeBuild}/${installerFileName}`;
    const localInstallerPath = path.join(SERVER_DIR, 'forge-installer.jar');

    this.progress = 25;
    this.statusMessage = `Forge ${version} (${forgeBuild}) yükleyicisi indiriliyor...`;
    this.emit('progress', { progress: 25, status: this.statusMessage });

    // 2. Download forge-installer.jar
    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localInstallerPath);
      const req = (url) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return req(res.headers.location);
          }
          if (res.statusCode !== 200) {
            file.close();
            fs.unlink(localInstallerPath, () => {});
            return reject(new Error(`Forge download failed (HTTP ${res.statusCode})`));
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(() => resolve(true));
          });
        }).on('error', (err) => {
          fs.unlink(localInstallerPath, () => {});
          reject(err);
        });
      };
      req(installerUrl);
    });

    // 3. Run Forge installer --installServer
    this.progress = 60;
    this.statusMessage = 'Forge sunucu kütüphaneleri kuruluyor (Bu işlem 1-2 dakika sürebilir)...';
    this.emit('progress', { progress: 60, status: this.statusMessage });

    await new Promise((resolve, reject) => {
      const installerProcess = spawn(javaPath || 'java', ['-jar', 'forge-installer.jar', '--installServer'], {
        cwd: SERVER_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      installerProcess.stdout.on('data', (d) => {
        const txt = d.toString();
        if (txt.includes('Extracting') || txt.includes('Processing')) {
          this.progress = Math.min(95, this.progress + 2);
          this.emit('progress', { progress: this.progress, status: this.statusMessage });
        }
      });

      installerProcess.on('close', (code) => {
        // Clean up installer jar
        try { fs.unlinkSync(localInstallerPath); } catch (e) {}
        try { fs.unlinkSync(path.join(SERVER_DIR, 'forge-installer.jar.log')); } catch (e) {}

        if (code === 0) {
          acceptEula();
          resolve(true);
        } else {
          reject(new Error(`Forge installer failed with exit code ${code}`));
        }
      });

      installerProcess.on('error', (err) => {
        try { fs.unlinkSync(localInstallerPath); } catch (e) {}
        reject(err);
      });
    });

    this.isInstalling = false;
    this.progress = 100;
    this.statusMessage = `Forge ${version} başarıyla kuruldu!`;
    acceptEula();
    this.emit('complete', { status: this.statusMessage });
    return true;
  }

  downloadJar(url, label) {
    return new Promise((resolve, reject) => {
      ensureServerDir();
      this.isInstalling = true;
      this.progress = 0;
      this.statusMessage = `${label} indiriliyor...`;
      this.emit('progress', { progress: 0, status: this.statusMessage });

      const file = fs.createWriteStream(SERVER_JAR_PATH);

      const requestClient = (targetUrl) => {
        const client = targetUrl.startsWith('https') ? https : http;
        client.get(targetUrl, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return requestClient(response.headers.location);
          }

          if (response.statusCode !== 200) {
            this.isInstalling = false;
            file.close();
            fs.unlink(SERVER_JAR_PATH, () => {});
            const err = new Error(`Download failed with HTTP ${response.statusCode}`);
            this.statusMessage = err.message;
            this.emit('error', { error: err.message });
            return reject(err);
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          response.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0) {
              this.progress = Math.round((receivedBytes / totalBytes) * 100);
              this.statusMessage = `${label} indiriliyor (${this.progress}%)...`;
              this.emit('progress', { progress: this.progress, status: this.statusMessage });
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close(() => {
              this.isInstalling = false;
              this.progress = 100;
              this.statusMessage = `${label} başarıyla kuruldu!`;

              acceptEula();
              const currentProps = require('./configManager').readProperties();
              if (Object.keys(currentProps).length === 0) {
                saveProperties({
                  'motd': '§aMinecraft Server §7| §ePowered by Web Panel & Playit.gg',
                  'server-port': '25565',
                  'online-mode': 'false',
                  'max-players': '20',
                  'difficulty': 'easy',
                  'gamemode': 'survival',
                  'pvp': 'true',
                  'enable-command-block': 'true',
                  'view-distance': '10'
                });
              }

              this.emit('complete', { status: this.statusMessage });
              resolve(true);
            });
          });
        }).on('error', (err) => {
          this.isInstalling = false;
          fs.unlink(SERVER_JAR_PATH, () => {});
          this.statusMessage = `Download error: ${err.message}`;
          this.emit('error', { error: err.message });
          reject(err);
        });
      };

      requestClient(url);
    });
  }

  isServerJarInstalled() {
    return fs.existsSync(SERVER_JAR_PATH) || fs.existsSync(path.join(SERVER_DIR, 'run.bat')) || this.findForgeJar();
  }

  findForgeJar() {
    ensureServerDir();
    const files = fs.readdirSync(SERVER_DIR);
    return files.find(f => f.toLowerCase().startsWith('forge-') && f.toLowerCase().endsWith('.jar'));
  }

  getServerJarInfo() {
    ensureServerDir();
    const runBat = path.join(SERVER_DIR, 'run.bat');
    const forgeJar = this.findForgeJar();

    if (fs.existsSync(runBat)) {
      return {
        exists: true,
        type: 'Forge (run.bat)',
        sizeMb: 'Modlu Forge',
        modified: fs.statSync(runBat).mtime
      };
    }

    if (forgeJar) {
      const stat = fs.statSync(path.join(SERVER_DIR, forgeJar));
      return {
        exists: true,
        type: `Forge (${forgeJar})`,
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        modified: stat.mtime
      };
    }

    if (fs.existsSync(SERVER_JAR_PATH)) {
      const stat = fs.statSync(SERVER_JAR_PATH);
      return {
        exists: true,
        type: 'server.jar',
        sizeMb: (stat.size / (1024 * 1024)).toFixed(2),
        modified: stat.mtime
      };
    }

    return { exists: false };
  }
}

const installer = new ServerInstaller();
module.exports = installer;
