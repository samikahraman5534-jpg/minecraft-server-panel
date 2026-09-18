const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const pidusage = require('pidusage');
const { SERVER_DIR, ensureServerDir, acceptEula, getEulaStatus, readSystemSettings } = require('./configManager');

const SERVER_JAR_PATH = path.join(SERVER_DIR, 'server.jar');

class MinecraftProcessManager {
  constructor() {
    this.process = null;
    this.status = 'OFFLINE'; // OFFLINE, STARTING, ONLINE, STOPPING
    this.onlinePlayers = new Set();
    this.logs = [];
    this.listeners = new Set();
    this.statsInterval = null;
    this.stats = {
      cpu: 0,
      memory: 0,
      memoryFormatted: '0 MB',
      uptime: 0,
      uptimeFormatted: '0s'
    };
    this.startTime = null;
    this.selectedJava = this.detectDefaultJava();
    this.maxRamGb = 4;
    this.minRamGb = 2;
  }

  detectDefaultJava() {
    const candidates = [
      'C:\\Program Files\\Eclipse Adoptium\\jre-21.0.12.101-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.12.101-hotspot\\bin\\java.exe',
      'C:\\Program Files\\Java\\jre1.8.0_503\\bin\\java.exe',
      'java'
    ];
    for (const cand of candidates) {
      if (cand === 'java' || fs.existsSync(cand)) {
        return cand;
      }
    }
    return 'java';
  }

  getDetectedJavas() {
    const found = [];
    const searchDirs = [
      'C:\\Program Files\\Eclipse Adoptium',
      'C:\\Program Files\\Java',
      'C:\\Program Files\\Microsoft',
      'C:\\Program Files\\Zulu'
    ];

    for (const base of searchDirs) {
      if (fs.existsSync(base)) {
        try {
          const scan = (dir, depth = 0) => {
            if (depth > 3) return;
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const full = path.join(dir, entry.name);
              if (entry.isDirectory()) {
                scan(full, depth + 1);
              } else if (entry.name.toLowerCase() === 'java.exe') {
                found.push(full);
              }
            }
          };
          scan(base);
        } catch (e) {}
      }
    }

    if (!found.includes('java')) {
      found.push('java');
    }
    return [...new Set(found)];
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
        console.error('MC listener error:', err);
      }
    }
  }

  findForgeJar() {
    ensureServerDir();
    const files = fs.readdirSync(SERVER_DIR);
    return files.find(f => f.toLowerCase().startsWith('forge-') && f.toLowerCase().endsWith('.jar'));
  }

  getStatus() {
    const runBat = path.join(SERVER_DIR, 'run.bat');
    const hasJar = fs.existsSync(SERVER_JAR_PATH) || fs.existsSync(runBat) || !!this.findForgeJar();

    return {
      status: this.status,
      hasJar,
      eulaAccepted: getEulaStatus(),
      onlinePlayers: Array.from(this.onlinePlayers),
      playerCount: this.onlinePlayers.size,
      stats: this.stats,
      javaPath: this.selectedJava,
      maxRamGb: this.maxRamGb,
      minRamGb: this.minRamGb,
      logs: this.logs.slice(-100)
    };
  }

  addLog(rawText) {
    const lines = rawText.split(/\r?\n/);
    for (const line of lines) {
      if (!line.trim()) continue;
      const logObj = {
        timestamp: new Date().toISOString(),
        text: line
      };
      this.logs.push(logObj);
      if (this.logs.length > 500) {
        this.logs.shift();
      }
      this.emit('log', logObj);
    }
  }

  async start(options = {}) {
    if (this.process) {
      throw new Error('Sunucu zaten çalışıyor veya başlatılıyor.');
    }

    ensureServerDir();
    acceptEula();

    const savedSettings = readSystemSettings();
    if (options.javaPath) this.selectedJava = options.javaPath;
    else if (savedSettings.javaPath && savedSettings.javaPath !== 'auto') this.selectedJava = savedSettings.javaPath;

    if (options.maxRamGb) this.maxRamGb = parseInt(options.maxRamGb, 10);
    else if (savedSettings.maxRamGb) this.maxRamGb = parseInt(savedSettings.maxRamGb, 10);

    if (options.minRamGb) this.minRamGb = parseInt(options.minRamGb, 10);
    else if (savedSettings.minRamGb) this.minRamGb = parseInt(savedSettings.minRamGb, 10);

    const customFlags = (savedSettings.customJvmArgs || '').split(/\s+/).filter(Boolean);
    const javaBin = this.selectedJava || 'java';
    const runBat = path.join(SERVER_DIR, 'run.bat');
    const forgeJar = this.findForgeJar();

    let executable = javaBin;
    let spawnArgs = [];

    // Modern Forge with run.bat / win_args.txt
    if (fs.existsSync(runBat)) {
      // Configure user_jvm_args.txt
      const jvmArgsFile = path.join(SERVER_DIR, 'user_jvm_args.txt');
      const jvmFlagsList = (savedSettings.customJvmArgs || '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200').split(/\s+/).filter(Boolean);
      let jvmContent = `# Modern Forge JVM Args Managed by Web Panel\n-Xms${this.minRamGb}G\n-Xmx${this.maxRamGb}G\n${jvmFlagsList.join('\n')}\n`;
      fs.writeFileSync(jvmArgsFile, jvmContent, 'utf-8');

      // Find win_args.txt file
      let winArgsRel = null;
      try {
        const runBatContent = fs.readFileSync(runBat, 'utf-8');
        const match = runBatContent.match(/@(libraries[/\\][^\s]+win_args\.txt)/i);
        if (match) {
          winArgsRel = match[1].replace(/\\/g, '/');
        }
      } catch (e) {}

      if (!winArgsRel) {
        const forgeDir = path.join(SERVER_DIR, 'libraries', 'net', 'minecraftforge', 'forge');
        if (fs.existsSync(forgeDir)) {
          const versions = fs.readdirSync(forgeDir);
          for (const ver of versions) {
            const candidate = path.join(forgeDir, ver, 'win_args.txt');
            if (fs.existsSync(candidate)) {
              winArgsRel = `libraries/net/minecraftforge/forge/${ver}/win_args.txt`;
              break;
            }
          }
        }
      }

      if (winArgsRel) {
        executable = javaBin;
        spawnArgs = ['@user_jvm_args.txt', `@${winArgsRel}`, 'nogui'];
        this.addLog(`[WebPanel] Modern Forge başlatılıyor (Java: ${javaBin}, RAM: ${this.maxRamGb}GB)...`);
      } else {
        executable = 'cmd.exe';
        spawnArgs = ['/c', 'run.bat', 'nogui'];
        this.addLog(`[WebPanel] Modern Forge (run.bat) başlatılıyor (${this.maxRamGb}GB RAM)...`);
      }
    } else if (forgeJar) {
      // Classic Forge
      spawnArgs = [
        `-Xms${this.minRamGb}G`,
        `-Xmx${this.maxRamGb}G`,
        ...customFlags,
        '-jar',
        forgeJar,
        'nogui'
      ];
      this.addLog(`[WebPanel] Forge Server (${forgeJar}) başlatılıyor...`);
    } else if (fs.existsSync(SERVER_JAR_PATH)) {
      // Standard Paper / Purpur / Vanilla / Fabric
      spawnArgs = [
        `-Xms${this.minRamGb}G`,
        `-Xmx${this.maxRamGb}G`,
        ...(customFlags.length > 0 ? customFlags : [
          '-XX:+UseG1GC',
          '-XX:+ParallelRefProcEnabled',
          '-XX:MaxGCPauseMillis=200',
          '-XX:+UnlockExperimentalVMOptions',
          '-XX:+DisableExplicitGC',
          '-XX:+AlwaysPreTouch'
        ]),
        '-jar',
        'server.jar',
        'nogui'
      ];
      this.addLog(`[WebPanel] Minecraft Server (server.jar) başlatılıyor (${this.maxRamGb}GB RAM)...`);
    } else {
      throw new Error('Sunucu çekirdeği (server.jar / run.bat) bulunamadı! Lütfen "Sürüm & Kurulum" sekmesinden bir sürüm indirin.');
    }

    this.status = 'STARTING';
    this.onlinePlayers.clear();
    this.startTime = Date.now();
    this.emit('status', this.getStatus());

    try {
      const javaDir = path.dirname(javaBin);
      const customEnv = {
        ...process.env,
        JAVA_HOME: path.dirname(javaDir),
        PATH: `${javaDir};${process.env.PATH || ''}`
      };

      this.process = spawn(executable, spawnArgs, {
        cwd: SERVER_DIR,
        env: customEnv,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        this.parseOutput(data.toString());
      });

      this.process.stderr.on('data', (data) => {
        this.parseOutput(data.toString());
      });

      this.process.on('close', (code) => {
        this.addLog(`[WebPanel] Minecraft sunucusu kapandı (kod ${code})`);
        this.cleanup();
      });

      this.process.on('error', (err) => {
        this.addLog(`[WebPanel] Sunucu başlatma hatası: ${err.message}`);
        this.cleanup();
      });

      this.startStatsMonitor();
    } catch (err) {
      this.cleanup();
      throw err;
    }
  }

  parseOutput(chunk) {
    this.addLog(chunk);
    const lower = chunk.toLowerCase();

    // Detect server online / ready
    if (
      lower.includes('done (') ||
      lower.includes('for help, type "help"') ||
      lower.includes('for help, type \'help\'') ||
      lower.includes('server started.')
    ) {
      if (this.status !== 'ONLINE') {
        this.status = 'ONLINE';
        this.emit('status', this.getStatus());
      }
    }

    // Detect player joins
    const joinMatch = chunk.match(/:\s*([a-zA-Z0-9_]{3,16})\s+joined the game/i) ||
                      chunk.match(/:\s*([a-zA-Z0-9_]{3,16})\[.*?\]\s+logged in/i);
    if (joinMatch) {
      const name = joinMatch[1];
      this.onlinePlayers.add(name);
      this.emit('players_changed', { players: Array.from(this.onlinePlayers) });
      this.emit('status', this.getStatus());
    }

    // Detect player leaves
    const leaveMatch = chunk.match(/:\s*([a-zA-Z0-9_]{3,16})\s+left the game/i) ||
                       chunk.match(/:\s*([a-zA-Z0-9_]{3,16})\s+lost connection/i);
    if (leaveMatch) {
      const name = leaveMatch[1];
      this.onlinePlayers.delete(name);
      this.emit('players_changed', { players: Array.from(this.onlinePlayers) });
      this.emit('status', this.getStatus());
    }
  }

  sendCommand(cmd) {
    if (!this.process || !this.process.stdin) {
      throw new Error('Sunucu çalışmıyor.');
    }
    const cleanCmd = cmd.trim();
    this.addLog(`> ${cleanCmd}`);
    this.process.stdin.write(cleanCmd + '\n');
  }

  async stop() {
    if (!this.process) {
      this.status = 'OFFLINE';
      this.emit('status', this.getStatus());
      return;
    }

    this.status = 'STOPPING';
    this.emit('status', this.getStatus());
    this.addLog('[WebPanel] Sunucuya "stop" komutu gönderiliyor...');

    try {
      this.sendCommand('stop');
    } catch (e) {
      this.kill();
      return;
    }

    setTimeout(() => {
      if (this.process) {
        this.addLog('[WebPanel] Sunucu kapanmadı, zorla kapatılıyor (Kill)...');
        this.kill();
      }
    }, 15000);
  }

  async restart() {
    await this.stop();
    const checkInterval = setInterval(() => {
      if (this.status === 'OFFLINE') {
        clearInterval(checkInterval);
        this.start();
      }
    }, 1000);
  }

  kill() {
    if (this.process) {
      try {
        this.process.kill('SIGKILL');
      } catch (err) {}
    }
    this.cleanup();
  }

  cleanup() {
    this.process = null;
    this.status = 'OFFLINE';
    this.onlinePlayers.clear();
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
    this.stats = {
      cpu: 0,
      memory: 0,
      memoryFormatted: '0 MB',
      uptime: 0,
      uptimeFormatted: '0s'
    };
    this.emit('status', this.getStatus());
  }

  startStatsMonitor() {
    if (this.statsInterval) clearInterval(this.statsInterval);
    this.statsInterval = setInterval(async () => {
      if (!this.process || !this.process.pid) return;

      try {
        const usage = await pidusage(this.process.pid);
        const memMb = Math.round(usage.memory / (1024 * 1024));
        const memFormatted = memMb > 1024 ? `${(memMb / 1024).toFixed(2)} GB` : `${memMb} MB`;

        let uptimeSec = 0;
        if (this.startTime) {
          uptimeSec = Math.floor((Date.now() - this.startTime) / 1000);
        }
        const hours = Math.floor(uptimeSec / 3600);
        const mins = Math.floor((uptimeSec % 3600) / 60);
        const secs = uptimeSec % 60;
        const uptimeFormatted = `${hours}h ${mins}m ${secs}s`;

        this.stats = {
          cpu: Math.min(100, Math.round(usage.cpu)),
          memory: memMb,
          memoryFormatted,
          uptime: uptimeSec,
          uptimeFormatted
        };
        this.emit('stats', this.stats);
      } catch (err) {}
    }, 2000);
  }
}

const mcProcess = new MinecraftProcessManager();
module.exports = mcProcess;
