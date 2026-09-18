const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const https = require('https');

const BIN_DIR = path.resolve(__dirname, '..', 'bin');
const PLAYIT_EXE = path.join(BIN_DIR, 'playit.exe');
const PLAYIT_DOWNLOAD_URL = 'https://github.com/playit-cloud/playit-agent/releases/download/v1.0.10/playit-windows-x86_64-signed.exe';

const { readSystemSettings, saveSystemSettings } = require('./configManager');

class PlayitManager {
  constructor() {
    this.process = null;
    this.status = 'STOPPED';
    this.claimUrl = null;
    this.tunnels = [];
    
    const settings = readSystemSettings();
    this.customDomain = settings.playitDomain || '';
    this.publicAddress = this.customDomain;
    this.logs = [{
      timestamp: new Date().toISOString(),
      text: '[Playit] Servis hazır. Tüneli başlatmak için Başlat butonuna tıklayın.'
    }];
    this.listeners = new Set();
    this.downloadProgress = 100;

    if (!fs.existsSync(BIN_DIR)) {
      fs.mkdirSync(BIN_DIR, { recursive: true });
    }
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
        console.error('Playit listener error:', err);
      }
    }
  }

  isInstalled() {
    return fs.existsSync(PLAYIT_EXE);
  }

  setCustomDomain(domain) {
    this.customDomain = domain || '';
    this.publicAddress = domain || '';
    saveSystemSettings({ playitDomain: domain || '' });
    if (domain) {
      this.emit('tunnel_found', { address: domain });
    }
    this.emit('status', this.getStatus());
  }

  getStatus() {
    return {
      status: this.status,
      isInstalled: this.isInstalled(),
      claimUrl: this.claimUrl,
      publicAddress: this.publicAddress || this.customDomain || '',
      customDomain: this.customDomain || '',
      tunnels: this.tunnels.length > 0 ? this.tunnels : (this.customDomain ? [this.customDomain] : []),
      downloadProgress: this.downloadProgress,
      logs: this.logs.slice(-50)
    };
  }

  addLog(message) {
    const logObj = {
      timestamp: new Date().toISOString(),
      text: message
    };
    this.logs.push(logObj);
    if (this.logs.length > 300) {
      this.logs.shift();
    }
    this.emit('log', logObj);
  }

  download() {
    return new Promise((resolve, reject) => {
      if (this.status === 'DOWNLOADING') {
        return reject(new Error('Already downloading playit.exe'));
      }
      this.status = 'DOWNLOADING';
      this.downloadProgress = 0;
      this.addLog('Starting download of playit.exe from official Playit.gg repository...');
      this.emit('status', this.getStatus());

      const file = fs.createWriteStream(PLAYIT_EXE);

      const makeRequest = (url) => {
        https.get(url, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return makeRequest(response.headers.location);
          }

          if (response.statusCode !== 200) {
            this.status = 'ERROR';
            this.emit('status', this.getStatus());
            file.close();
            fs.unlink(PLAYIT_EXE, () => {});
            return reject(new Error(`Download failed with status ${response.statusCode}`));
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let receivedBytes = 0;

          response.on('data', (chunk) => {
            receivedBytes += chunk.length;
            if (totalBytes > 0) {
              this.downloadProgress = Math.round((receivedBytes / totalBytes) * 100);
              this.emit('download_progress', { progress: this.downloadProgress });
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close(() => {
              this.status = 'STOPPED';
              this.downloadProgress = 100;
              this.addLog('playit.exe downloaded and ready.');
              this.emit('status', this.getStatus());
              resolve(true);
            });
          });
        }).on('error', (err) => {
          fs.unlink(PLAYIT_EXE, () => {});
          this.status = 'ERROR';
          this.addLog(`Download error: ${err.message}`);
          this.emit('status', this.getStatus());
          reject(err);
        });
      };

      makeRequest(PLAYIT_DOWNLOAD_URL);
    });
  }

  async start() {
    if (this.process) {
      throw new Error('Playit process is already running.');
    }

    if (!this.isInstalled()) {
      await this.download();
    }

    this.status = 'STARTING';
    this.claimUrl = null;
    this.publicAddress = null;
    this.tunnels = [];
    this.addLog('Starting Playit.gg tunnel agent...');
    this.emit('status', this.getStatus());

    try {
      this.process = spawn(PLAYIT_EXE, [], {
        cwd: BIN_DIR,
        env: process.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        const text = data.toString();
        this.parseOutput(text);
      });

      this.process.stderr.on('data', (data) => {
        const text = data.toString();
        this.parseOutput(text);
      });

      this.process.on('close', (code) => {
        this.addLog(`Playit process exited with code ${code}`);
        this.process = null;
        this.status = 'STOPPED';
        this.emit('status', this.getStatus());
      });

      this.process.on('error', (err) => {
        this.addLog(`Playit process error: ${err.message}`);
        this.process = null;
        this.status = 'ERROR';
        this.emit('status', this.getStatus());
      });
    } catch (err) {
      this.status = 'ERROR';
      this.addLog(`Failed to launch playit.exe: ${err.message}`);
      this.emit('status', this.getStatus());
      throw err;
    }
  }

  parseOutput(chunk) {
    const lines = chunk.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      this.addLog(line);

      // Detect Claim link (e.g., https://playit.gg/claim/xxxx or https://playit.gg/manage/...)
      const claimMatch = line.match(/https:\/\/playit\.gg\/claim\/[a-zA-Z0-9_-]+/i) ||
                         line.match(/https:\/\/playit\.gg\/manage\/[a-zA-Z0-9_-]+/i);
      if (claimMatch) {
        this.claimUrl = claimMatch[0];
        this.status = 'NEEDS_CLAIM';
        this.emit('claim_url', { url: this.claimUrl });
        this.emit('status', this.getStatus());
      }

      // Detect tunnel mappings (e.g. your-server.tun.ply.gg, my-server.joinmc.link, etc.)
      const tunnelMatch = line.match(/([a-zA-Z0-9.-]+\.tun\.ply\.gg(?::\d+)?)/i) ||
                          line.match(/([a-zA-Z0-9.-]+\.ply\.gg(?::\d+)?)/i) ||
                          line.match(/([a-zA-Z0-9.-]+\.joinmc\.link(?::\d+)?)/i) ||
                          line.match(/([a-zA-Z0-9.-]+\.playit\.gg(?::\d+)?)/i) ||
                          line.match(/tunnel.*?([a-zA-Z0-9.-]+:\d+)\s*=>/i);
      if (tunnelMatch) {
        this.publicAddress = tunnelMatch[1];
        if (!this.tunnels.includes(this.publicAddress)) {
          this.tunnels.push(this.publicAddress);
        }
        this.status = 'RUNNING';
        this.emit('tunnel_found', { address: this.publicAddress });
        this.emit('status', this.getStatus());
      }

      if (line.toLowerCase().includes('tunnel running') || line.toLowerCase().includes('loaded 1 tunnels') || line.toLowerCase().includes('tunnels registered')) {
        this.status = 'RUNNING';
        this.emit('status', this.getStatus());
      }
    }
  }

  stop() {
    return new Promise((resolve) => {
      if (!this.process) {
        this.status = 'STOPPED';
        this.emit('status', this.getStatus());
        return resolve(true);
      }
      this.addLog('Stopping Playit.gg agent...');
      try {
        this.process.kill();
      } catch (err) {
        console.error('Error killing playit process:', err);
      }
      this.process = null;
      this.status = 'STOPPED';
      this.emit('status', this.getStatus());
      resolve(true);
    });
  }

  async resetSecret() {
    await this.stop();
    // Playit config can be in bin/playit.toml or user appdata
    const localToml = path.join(BIN_DIR, 'playit.toml');
    if (fs.existsSync(localToml)) {
      try { fs.unlinkSync(localToml); } catch {}
    }
    const appData = process.env.APPDATA || '';
    if (appData) {
      const playitAppData = path.join(appData, 'playit_gg');
      if (fs.existsSync(playitAppData)) {
        try { fs.rmSync(playitAppData, { recursive: true, force: true }); } catch {}
      }
    }
    this.claimUrl = null;
    this.publicAddress = null;
    this.tunnels = [];
    this.addLog('Playit credentials reset. Starting will generate a new claim link.');
    this.emit('status', this.getStatus());
  }
}

const playitManager = new PlayitManager();
module.exports = playitManager;
