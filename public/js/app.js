// Global Toast Notification Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ')}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

class MinecraftApp {
  constructor() {
    this.ws = null;
    this.currentTab = 'dashboard';
    this.currentFilePath = '';
    this.serverStatus = 'OFFLINE';
    this.installedJar = false;
    this.versionsData = { purpur: [], forge: [], vanilla: [] };

    this.initElements();
    this.initNavigation();
    this.initServerControls();
    this.initInstaller();
    this.initMods();
    this.initWorlds();
    this.initProperties();
    this.initPlayers();
    this.initFiles();
    this.initBackups();
    this.loadSystemSettings();
    this.connectWebSocket();
  }

  initElements() {
    this.serverStatusDot = document.getElementById('server-status-dot');
    this.serverStatusText = document.getElementById('server-status-text');
    this.btnStart = document.getElementById('btn-start-server');
    this.btnStop = document.getElementById('btn-stop-server');
    this.btnRestart = document.getElementById('btn-restart-server');
    this.btnKill = document.getElementById('btn-kill-server');

    this.statRam = document.getElementById('stat-ram');
    this.statCpu = document.getElementById('stat-cpu');
    this.statPlayers = document.getElementById('stat-players');
    this.statUptime = document.getElementById('stat-uptime');
    this.ramBar = document.getElementById('ram-progress-fill');
    this.cpuBar = document.getElementById('cpu-progress-fill');
    this.statVersion = document.getElementById('stat-version-info');
    this.statJarSize = document.getElementById('stat-jar-size');
  }

  // -------------------------------------------------------------
  // WebSocket Communication
  // -------------------------------------------------------------
  connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    this.ws = new WebSocket(wsUrl);
    window.appWs = this.ws;

    this.ws.onopen = () => {
      console.log('[WebSocket] Connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleWsMessage(msg);
      } catch (err) {
        console.error('WS Parse Error:', err);
      }
    };

    this.ws.onclose = () => {
      console.warn('[WebSocket] Closed. Reconnecting in 3s...');
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  handleWsMessage(msg) {
    const { type, data } = msg;

    if (type === 'init') {
      if (data.server) this.updateServerState(data.server);
      if (data.playit) window.playitUI?.update(data.playit);
      if (data.javas) this.populateJavaDropdown(data.javas);
      if (data.jarInfo) this.updateJarInfo(data.jarInfo);
    } else if (type === 'mc_status') {
      this.updateServerState(data);
    } else if (type === 'mc_log') {
      window.consoleManager?.appendLine(data);
    } else if (type === 'mc_stats') {
      this.updateStats(data);
    } else if (type === 'mc_players') {
      this.renderOnlinePlayers(data.players || []);
    } else if (type === 'playit_status') {
      window.playitUI?.update(data);
    } else if (type === 'playit_log') {
      window.playitUI?.appendLog(data);
    } else if (type === 'installer_progress') {
      this.updateInstallProgress(data);
    } else if (type === 'installer_complete') {
      this.finishInstall(data);
    } else if (type === 'installer_error') {
      showToast(`Kurulum hatası: ${data.error}`, 'error');
      const pBox = document.getElementById('install-progress-box');
      if (pBox) pBox.style.display = 'none';
    }
  }

  // -------------------------------------------------------------
  // Tab Navigation
  // -------------------------------------------------------------
  initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchTab(tab);
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tabName}"]`)?.classList.add('active');

    document.querySelectorAll('.tab-content').forEach((tc) => tc.classList.remove('active'));
    document.getElementById(`tab-${tabName}`)?.classList.add('active');

    const titles = {
      dashboard: ['Genel Bakış', 'Minecraft sunucunuzu ve Playit tünelinizi yönetin'],
      console: ['Canlı Konsol', 'Sunucu komutlarını ve gerçek zamanlı log akışını izleyin'],
      playit: ['Playit.gg Tünel', 'Portsuz bağlantı ve tünel durumunu kontrol edin'],
      mods: ['Mod Yöneticisi', 'Forge ve Fabric modlarını yönetin, Modrinth üzerinden tek tıkla kurun'],
      worlds: ['Dünya Yöneticisi', 'Haritalar oluşturun, dışarıdan harita (.zip) yükleyin ve dünyaları değiştirin'],
      installer: ['Sürüm & Kurulum', 'Minecraft Forge, Fabric, Purpur veya Vanilla çekirdeğini yükleyin'],
      properties: ['Sunucu Ayarları', 'server.properties ve oyun parametrelerini özelleştirin'],
      players: ['Oyuncu Yönetimi', 'OP, Beyaz Liste (Whitelist) ve Banlı oyuncuları düzenleyin'],
      files: ['Dosyalar & Eklentiler', 'Sunucu dizinindeki dosyaları ve pluginleri yönetin'],
      backups: ['Dünya Yedekleri', 'Dünya dosyalarını tek tıkla yedekleyin veya geri yükleyin']
    };

    if (titles[tabName]) {
      document.getElementById('page-title').textContent = titles[tabName][0];
      document.getElementById('page-subtitle').textContent = titles[tabName][1];
    }

    if (tabName === 'mods') this.loadMods();
    if (tabName === 'worlds') this.loadWorlds();
    if (tabName === 'properties') this.loadProperties();
    if (tabName === 'players') this.loadPlayers();
    if (tabName === 'files') this.loadFiles(this.currentFilePath);
    if (tabName === 'backups') this.loadBackups();
  }

  // -------------------------------------------------------------
  // Server State & Controls
  // -------------------------------------------------------------
  initServerControls() {
    this.btnStart?.addEventListener('click', () => this.startServer());
    this.btnStop?.addEventListener('click', () => this.stopServer());
    this.btnRestart?.addEventListener('click', () => this.restartServer());
    this.btnKill?.addEventListener('click', () => this.killServer());
  }

  async startServer() {
    try {
      const javaPath = document.getElementById('select-java-path')?.value;
      const settingMax = document.getElementById('setting-max-ram')?.value;
      const settingMin = document.getElementById('setting-min-ram')?.value;
      const installerRam = document.getElementById('ram-slider')?.value;

      const maxRamGb = settingMax ? parseInt(settingMax, 10) : (installerRam ? parseInt(installerRam, 10) : null);
      const minRamGb = settingMin ? parseInt(settingMin, 10) : (maxRamGb ? Math.max(1, Math.floor(maxRamGb / 2)) : null);

      showToast('Minecraft sunucusu başlatılıyor...', 'info');
      const res = await fetch('/api/server/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          javaPath: javaPath === 'auto' ? null : javaPath,
          maxRamGb,
          minRamGb
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Sunucu başlatma komutu verildi.', 'success');
    } catch (err) {
      showToast(`Başlatma hatası: ${err.message}`, 'error');
    }
  }

  async stopServer() {
    try {
      showToast('Sunucu durduruluyor...', 'info');
      const res = await fetch('/api/server/stop', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Sunucuya "stop" komutu gönderildi.', 'info');
    } catch (err) {
      showToast(`Durdurma hatası: ${err.message}`, 'error');
    }
  }

  async restartServer() {
    try {
      showToast('Sunucu yeniden başlatılıyor...', 'info');
      const res = await fetch('/api/server/restart', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Sunucu yeniden başlatılıyor.', 'success');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async killServer() {
    if (!confirm('Sunucuyu zorla kapatmak (Kill) dünya kaydının bozulmasına neden olabilir. Devam edilsin mi?')) return;
    try {
      const res = await fetch('/api/server/kill', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Sunucu zorla kapatıldı.', 'warning');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  updateServerState(serverData) {
    if (!serverData) return;
    this.serverStatus = serverData.status || 'OFFLINE';
    this.installedJar = serverData.hasJar;

    const isOnline = this.serverStatus === 'ONLINE';
    const isStarting = this.serverStatus === 'STARTING';
    const isStopping = this.serverStatus === 'STOPPING';
    const isOffline = this.serverStatus === 'OFFLINE';

    // Update Status Dot & Text
    if (this.serverStatusDot && this.serverStatusText) {
      this.serverStatusDot.className = `status-indicator-dot ${this.serverStatus.toLowerCase()}`;
      const statusTexts = {
        ONLINE: 'AÇIK (ONLINE)',
        STARTING: 'BAŞLATILIYOR...',
        STOPPING: 'KAPANACAK...',
        OFFLINE: 'KAPALI (OFFLINE)'
      };
      this.serverStatusText.textContent = statusTexts[this.serverStatus] || this.serverStatus;
    }

    // Toggle Action Buttons
    if (this.btnStart) this.btnStart.style.display = isOffline ? 'inline-flex' : 'none';
    if (this.btnStop) this.btnStop.style.display = isOnline ? 'inline-flex' : 'none';
    if (this.btnRestart) this.btnRestart.style.display = isOnline ? 'inline-flex' : 'none';
    if (this.btnKill) this.btnKill.style.display = isStarting || isStopping || isOnline ? 'inline-flex' : 'none';

    // Player List
    this.renderOnlinePlayers(serverData.onlinePlayers || []);

    // Stats
    if (serverData.stats) this.updateStats(serverData.stats);
  }

  updateStats(stats) {
    if (!stats) return;
    if (this.statCpu) this.statCpu.textContent = `${stats.cpu}%`;
    if (this.cpuBar) this.cpuBar.style.width = `${Math.min(100, stats.cpu)}%`;

    if (this.statRam) {
      const maxRam = document.getElementById('ram-slider')?.value || 4;
      this.statRam.textContent = `${stats.memoryFormatted} / ${maxRam}.0 GB`;
      if (this.ramBar) {
        const percent = Math.min(100, Math.round((stats.memory / (maxRam * 1024)) * 100));
        this.ramBar.style.width = `${percent}%`;
      }
    }

    if (this.statUptime) {
      this.statUptime.textContent = `Açık Kalma: ${stats.uptimeFormatted || '0s'}`;
    }
  }

  renderOnlinePlayers(players) {
    const count = players.length;
    if (this.statPlayers) this.statPlayers.textContent = `${count} / 20`;
    const badge = document.getElementById('player-count-badge');
    if (badge) badge.textContent = `${count} Oyuncu`;

    const container = document.getElementById('dashboard-players-list');
    if (!container) return;

    if (count === 0) {
      container.innerHTML = '<div class="empty-state-small">Şu anda sunucuda oyuncu bulunmuyor.</div>';
      return;
    }

    container.innerHTML = '';
    for (const p of players) {
      const row = document.createElement('div');
      row.className = 'player-item-row';
      row.innerHTML = `
        <div class="player-user-info">
          <img class="player-head-img" src="https://mc-heads.net/avatar/${encodeURIComponent(p)}/32" alt="${p}" onerror="this.src='https://mc-heads.net/avatar/steve/32'">
          <span class="player-username">${p}</span>
        </div>
        <div class="player-actions">
          <button class="btn btn-sm btn-outline" onclick="window.app.playerQuickAction('op', '${p}')">+ OP</button>
          <button class="btn btn-sm btn-outline" onclick="window.app.playerQuickAction('gamemode creative', '${p}')">Yaratıcı</button>
          <button class="btn btn-sm btn-danger" onclick="window.app.playerQuickAction('kick', '${p}')">At</button>
        </div>
      `;
      container.appendChild(row);
    }
  }

  playerQuickAction(action, player) {
    let cmd = '';
    if (action === 'op') cmd = `op ${player}`;
    else if (action === 'kick') cmd = `kick ${player} Sunucudan atıldınız.`;
    else if (action.startsWith('gamemode')) cmd = `${action} ${player}`;
    if (cmd) {
      window.consoleManager?.input && (window.consoleManager.input.value = cmd);
      window.consoleManager?.sendCommand();
      showToast(`Komut uygulandı: ${cmd}`, 'success');
    }
  }

  // -------------------------------------------------------------
  // Mod Manager
  // -------------------------------------------------------------
  initMods() {
    // Subtabs
    document.querySelectorAll('.mod-subtab').forEach((st) => {
      st.addEventListener('click', () => {
        document.querySelectorAll('.mod-subtab').forEach(b => b.classList.remove('active'));
        st.classList.add('active');
        const target = st.getAttribute('data-subtab');
        document.querySelectorAll('#tab-mods .subtab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`mods-${target}-panel`)?.classList.add('active');
        if (target === 'installed') this.loadMods();
      });
    });

    document.getElementById('btn-refresh-mods')?.addEventListener('click', () => this.loadMods());

    // Mod input (header button)
    const modUploadInput = document.getElementById('mod-upload-input');
    if (modUploadInput) {
      modUploadInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.uploadModFiles(e.target.files);
          e.target.value = '';
        }
      });
    }

    // Dropzone Box Handlers
    const dropzone = document.getElementById('mod-dropzone');
    const dropzoneInput = document.getElementById('mod-dropzone-input');

    if (dropzone && dropzoneInput) {
      dropzone.addEventListener('click', () => dropzoneInput.click());

      dropzoneInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.uploadModFiles(e.target.files);
          e.target.value = '';
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.uploadModFiles(e.dataTransfer.files);
        }
      });
    }

    // Window global drag & drop when in Mods tab
    window.addEventListener('dragover', (e) => {
      if (this.currentTab === 'mods') {
        e.preventDefault();
      }
    });

    window.addEventListener('drop', (e) => {
      if (this.currentTab === 'mods') {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.uploadModFiles(e.dataTransfer.files);
        }
      }
    });

    // Modrinth search
    document.getElementById('btn-search-modrinth')?.addEventListener('click', () => this.searchModrinth());
    document.getElementById('modrinth-search-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.searchModrinth();
    });
  }

  async uploadModFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const formData = new FormData();
    let validCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      if (file.name.toLowerCase().endsWith('.jar') || file.name.toLowerCase().endsWith('.disabled')) {
        formData.append('mods', file);
        validCount++;
      }
    }

    if (validCount === 0) {
      showToast('Lütfen geçerli Minecraft mod dosyaları (.jar) sürükleyin.', 'error');
      return;
    }

    showToast(`${validCount} adet mod dosyası yükleniyor...`, 'info');
    try {
      const res = await fetch('/api/mods/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(`${validCount} adet mod başarıyla yüklendi!`, 'success');
      this.loadMods();
    } catch (err) {
      showToast(`Yükleme hatası: ${err.message}`, 'error');
    }
  }

  async loadMods() {
    const container = document.getElementById('installed-mods-list');
    if (!container) return;

    try {
      const res = await fetch('/api/mods/list');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      const badge = document.getElementById('mod-count-badge');
      if (badge) badge.textContent = data.mods.length;

      if (data.mods.length === 0) {
        container.innerHTML = '<div class="empty-state-small">Henüz mod yüklenmedi. "Mod (.jar) Yükle" butonunu kullanabilir veya Modrinth sekmesinden mod indirebilirsiniz.</div>';
        return;
      }

      container.innerHTML = '';
      for (const mod of data.mods) {
        const card = document.createElement('div');
        card.className = `mod-card-item ${mod.isEnabled ? '' : 'disabled'}`;
        card.innerHTML = `
          <div class="mod-info-col">
            <div class="mod-title" title="${mod.filename}">📦 ${mod.displayName}</div>
            <div class="mod-meta">${mod.sizeFormatted} • ${mod.isEnabled ? '✅ Aktif' : '⏸ Devre Dışı'}</div>
          </div>
          <div class="mod-actions-col">
            <label class="switch" title="${mod.isEnabled ? 'Modu Kapat' : 'Modu Aç'}">
              <input type="checkbox" ${mod.isEnabled ? 'checked' : ''} onchange="window.app.toggleMod('${mod.filename}')">
              <span class="slider"></span>
            </label>
            <button class="btn btn-sm btn-danger" title="Sil" onclick="window.app.deleteMod('${mod.filename}')">✕</button>
          </div>
        `;
        container.appendChild(card);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state-small text-danger">Hata: ${err.message}</div>`;
    }
  }

  async toggleMod(filename) {
    try {
      const res = await fetch('/api/mods/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(`Mod durumu güncellendi (${data.result.isEnabled ? 'Aktif' : 'Devre Dışı'})`, 'info');
      this.loadMods();
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async deleteMod(filename) {
    if (!confirm(`"${filename}" modunu silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/mods/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Mod silindi.', 'success');
      this.loadMods();
    } catch (err) {
      showToast(`Silme hatası: ${err.message}`, 'error');
    }
  }

  async searchModrinth() {
    const input = document.getElementById('modrinth-search-input');
    const loaderSel = document.getElementById('modrinth-loader-select');
    const container = document.getElementById('modrinth-results');
    if (!container) return;

    const query = input?.value.trim() || '';
    const loader = loaderSel?.value || 'forge';

    container.innerHTML = '<div class="empty-state-small">Modrinth taranıyor...</div>';
    try {
      const res = await fetch(`/api/mods/search?query=${encodeURIComponent(query)}&loader=${loader}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.hits.length === 0) {
        container.innerHTML = '<div class="empty-state-small">Eşleşen mod bulunamadı.</div>';
        return;
      }

      container.innerHTML = '';
      for (const hit of data.hits) {
        const card = document.createElement('div');
        card.className = 'modrinth-hit-card';
        card.innerHTML = `
          <div class="hit-header">
            <img class="hit-icon" src="${hit.iconUrl || 'https://cdn.modrinth.com/assets/unknown.svg'}" alt="${hit.title}" onerror="this.src='https://cdn.modrinth.com/assets/unknown.svg'">
            <div class="hit-title-wrap">
              <div class="hit-title">${hit.title}</div>
              <div class="hit-author">Geliştirici: ${hit.author}</div>
            </div>
          </div>
          <div class="hit-desc">${hit.description || 'Açıklama bulunmuyor.'}</div>
          <div class="hit-footer">
            <span class="hit-downloads">📥 ${Number(hit.downloads).toLocaleString()} İndirme</span>
            <button class="btn btn-sm btn-primary" onclick="window.app.installModrinthMod('${hit.slug}', '${loader}')">+ Sunucuya Kur</button>
          </div>
        `;
        container.appendChild(card);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state-small text-danger">Mod arama hatası: ${err.message}</div>`;
    }
  }

  async installModrinthMod(slug, loader) {
    showToast(`"${slug}" modu indiriliyor ve kuruluyor...`, 'info');
    try {
      const res = await fetch('/api/mods/install-modrinth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, loader })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(`${data.message}`, 'success');
      this.loadMods();
    } catch (err) {
      showToast(`Kurulum hatası: ${err.message}`, 'error');
    }
  }

  // -------------------------------------------------------------
  // Multi-World Manager
  // -------------------------------------------------------------
  initWorlds() {
    document.getElementById('btn-refresh-worlds')?.addEventListener('click', () => this.loadWorlds());

    // Create World form
    document.getElementById('form-create-world')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('new-world-name')?.value;
      const seed = document.getElementById('new-world-seed')?.value;
      const levelType = document.getElementById('new-world-type')?.value;

      showToast(`"${name}" dünyası oluşturuluyor...`, 'info');
      try {
        const res = await fetch('/api/worlds/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, seed, levelType })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast(data.message, 'success');
        document.getElementById('new-world-name').value = '';
        this.loadWorlds();
      } catch (err) {
        showToast(`Dünya oluşturma hatası: ${err.message}`, 'error');
      }
    });

    // Upload World ZIP form
    document.getElementById('form-upload-world')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fileInput = document.getElementById('upload-world-zip-input');
      const nameInput = document.getElementById('upload-world-name');

      if (!fileInput.files || fileInput.files.length === 0) return;

      const formData = new FormData();
      formData.append('worldZip', fileInput.files[0]);
      if (nameInput.value.trim()) {
        formData.append('worldName', nameInput.value.trim());
      }

      showToast('Harita ZIP dosyası yükleniyor ve açılıyor...', 'info');
      try {
        const res = await fetch('/api/worlds/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast(data.message, 'success');
        fileInput.value = '';
        nameInput.value = '';
        this.loadWorlds();
      } catch (err) {
        showToast(`Yükleme hatası: ${err.message}`, 'error');
      }
    });
  }

  async loadWorlds() {
    const container = document.getElementById('worlds-list-container');
    const heroName = document.getElementById('current-active-world-name');
    if (!container) return;

    try {
      const res = await fetch('/api/worlds/list');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (heroName) heroName.textContent = data.activeWorld || 'world';

      container.innerHTML = '';
      for (const world of data.worlds) {
        const card = document.createElement('div');
        card.className = `world-item-card ${world.isActive ? 'is-active' : ''}`;
        card.innerHTML = `
          <div class="world-card-header">
            <div class="world-name-heading">🌍 ${world.name}</div>
            <span class="pill ${world.isActive ? 'pill-online' : 'pill-offline'}">${world.isActive ? 'Aktif Dünya' : 'Yedek Dünya'}</span>
          </div>
          <div class="world-details">
            <span>Boyut: <strong>${world.sizeFormatted}</strong></span>
            <span>Son Oynanma: <strong>${world.modified ? new Date(world.modified).toLocaleDateString() : '-'}</strong></span>
          </div>
          <div class="world-actions-row">
            ${!world.isActive ? `<button class="btn btn-sm btn-primary" onclick="window.app.setActiveWorld('${world.name}')">✓ Aktif Yap</button>` : '<span class="text-success font-weight-bold" style="font-size:0.8rem;">Şu Anda Aktif</span>'}
            <a href="/api/worlds/download/${encodeURIComponent(world.name)}" class="btn btn-sm btn-outline">İndir (.zip)</a>
            <button class="btn btn-sm btn-outline" onclick="window.app.cloneWorld('${world.name}')">Klonla</button>
            ${!world.isActive ? `<button class="btn btn-sm btn-danger" onclick="window.app.deleteWorld('${world.name}')">Sil</button>` : ''}
          </div>
        `;
        container.appendChild(card);
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state-small text-danger">Hata: ${err.message}</div>`;
    }
  }

  async setActiveWorld(name) {
    try {
      const res = await fetch('/api/worlds/set-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(data.message, 'success');
      this.loadWorlds();
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async cloneWorld(sourceName) {
    const target = prompt(`"${sourceName}" dünyası için kopya adı girin:`, `${sourceName}_kopya`);
    if (!target) return;
    try {
      const res = await fetch('/api/worlds/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceName, target })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(data.message, 'success');
      this.loadWorlds();
    } catch (err) {
      showToast(`Klonlama hatası: ${err.message}`, 'error');
    }
  }

  async deleteWorld(name) {
    if (!confirm(`"${name}" dünyasını ve içindeki tüm blok/harita verilerini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/worlds/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast(data.message, 'success');
      this.loadWorlds();
    } catch (err) {
      showToast(`Silme hatası: ${err.message}`, 'error');
    }
  }

  // -------------------------------------------------------------
  // Installer & Version Management
  // -------------------------------------------------------------
  initInstaller() {
    const coreCards = document.querySelectorAll('.core-card');
    coreCards.forEach((c) => {
      c.addEventListener('click', () => {
        coreCards.forEach((other) => other.classList.remove('active'));
        c.classList.add('active');
        const radio = c.querySelector('input');
        if (radio) {
          radio.checked = true;
          this.updateVersionDropdownOptions(radio.value);
        }
      });
    });

    const ramSlider = document.getElementById('ram-slider');
    const ramVal = document.getElementById('ram-slider-value');
    if (ramSlider && ramVal) {
      ramSlider.addEventListener('input', () => {
        ramVal.textContent = `${ramSlider.value} GB RAM`;
      });
    }

    const btnInstall = document.getElementById('btn-install-server');
    if (btnInstall) {
      btnInstall.addEventListener('click', () => this.installServer());
    }

    this.loadInstallerVersions();
  }

  async loadInstallerVersions() {
    try {
      const res = await fetch('/api/installer/versions');
      const data = await res.json();
      if (data.success) {
        this.versionsData = data;
        const currentCore = document.querySelector('input[name="server-type"]:checked')?.value || 'forge';
        this.updateVersionDropdownOptions(currentCore);
      }
    } catch (e) {}
  }

  updateVersionDropdownOptions(coreType) {
    const select = document.getElementById('select-mc-version');
    if (!select) return;
    select.innerHTML = '';

    let list = [];
    if (coreType === 'forge') {
      list = this.versionsData.forge && this.versionsData.forge.length > 0
        ? this.versionsData.forge
        : ['1.20.4', '1.20.1', '1.19.4', '1.19.2', '1.18.2', '1.16.5', '1.12.2'];
    } else if (coreType === 'purpur') {
      list = this.versionsData.purpur || ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.16.5'];
    } else if (coreType === 'fabric') {
      list = ['1.21.4', '1.21.1', '1.20.4', '1.20.1', '1.19.4', '1.18.2', '1.16.5'];
    } else {
      list = this.versionsData.vanilla || ['1.21.4', '1.20.4', '1.16.5'];
    }

    for (const ver of list) {
      const opt = document.createElement('option');
      opt.value = ver;
      let label = ver;
      if (ver === '1.20.1') label += ' (Modlar İçin En Popüler)';
      else if (ver === '1.16.5') label += ' (Geniş Mod Desteği)';
      else if (ver === '1.20.4') label += ' (Stabil)';
      opt.textContent = label;
      if (ver === '1.20.1') opt.selected = true;
      select.appendChild(opt);
    }
  }

  populateJavaDropdown(javas) {
    const sel = document.getElementById('select-java-path');
    if (!sel || !javas) return;
    sel.innerHTML = '<option value="auto">Otomatik Algıla (Önerilen Java 21)</option>';
    for (const j of javas) {
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = j;
      sel.appendChild(opt);
    }
  }

  updateJarInfo(info) {
    const statusTxt = document.getElementById('info-jar-exists');
    const typeTxt = document.getElementById('info-jar-type');
    if (statusTxt) {
      if (info.exists) {
        statusTxt.textContent = `✓ Kurulu (${info.sizeMb} MB)`;
        statusTxt.style.color = '#6ee7b7';
        if (typeTxt) typeTxt.textContent = info.type || 'server.jar';
        if (this.statVersion) this.statVersion.textContent = info.type || 'Kurulu';
        if (this.statJarSize) this.statJarSize.textContent = `${info.sizeMb} MB`;
      } else {
        statusTxt.textContent = 'Yüklü Değil';
        statusTxt.style.color = '#f87171';
        if (typeTxt) typeTxt.textContent = '-';
      }
    }
  }

  async installServer() {
    const core = document.querySelector('input[name="server-type"]:checked')?.value || 'purpur';
    const version = document.getElementById('select-mc-version')?.value || '1.20.4';
    const javaPath = document.getElementById('select-java-path')?.value;

    const pBox = document.getElementById('install-progress-box');
    if (pBox) pBox.style.display = 'block';

    showToast(`${core.toUpperCase()} ${version} indiriliyor ve kuruluyor...`, 'info');
    try {
      const res = await fetch('/api/installer/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: core,
          version,
          javaPath: javaPath === 'auto' ? null : javaPath
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
    } catch (err) {
      showToast(`Kurulum başlatılamadı: ${err.message}`, 'error');
      if (pBox) pBox.style.display = 'none';
    }
  }

  updateInstallProgress(data) {
    const pBox = document.getElementById('install-progress-box');
    const pBar = document.getElementById('install-progress-bar');
    const pTxt = document.getElementById('install-status-text');
    const pPer = document.getElementById('install-percent-text');
    if (pBox) pBox.style.display = 'block';
    if (pBar) pBar.style.width = `${data.progress}%`;
    if (pTxt) pTxt.textContent = data.status;
    if (pPer) pPer.textContent = `${data.progress}%`;
  }

  finishInstall(data) {
    showToast('Sunucu kurulumu tamamlandı ve EULA kabul edildi!', 'success');
    const pBox = document.getElementById('install-progress-box');
    if (pBox) pBox.style.display = 'none';
    fetch('/api/status').then(r => r.json()).then(res => {
      if (res.jarInfo) this.updateJarInfo(res.jarInfo);
    });
  }

  // -------------------------------------------------------------
  // Properties / Config & RAM Performance
  // -------------------------------------------------------------
  initProperties() {
    document.querySelectorAll('.prop-subtab').forEach((st) => {
      st.addEventListener('click', () => {
        document.querySelectorAll('.prop-subtab').forEach(b => b.classList.remove('active'));
        st.classList.add('active');
        const target = st.getAttribute('data-subtab');
        document.querySelectorAll('#tab-properties .subtab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`prop-${target}-panel`)?.classList.add('active');

        if (target === 'performance') this.loadSystemSettings();
        if (target === 'forge-jvm') this.loadForgeJvm();
      });
    });

    const motdInput = document.getElementById('prop-motd');
    const motdPreview = document.getElementById('motd-preview');
    if (motdInput && motdPreview) {
      motdInput.addEventListener('input', () => {
        motdPreview.innerHTML = window.consoleManager?.formatMinecraftColors(window.consoleManager.escapeHtml(motdInput.value)) || motdInput.value;
      });
    }

    // RAM Sliders
    const maxRamSlider = document.getElementById('setting-max-ram');
    const maxRamLabel = document.getElementById('setting-max-ram-label');
    const minRamSlider = document.getElementById('setting-min-ram');
    const minRamLabel = document.getElementById('setting-min-ram-label');

    if (maxRamSlider && maxRamLabel) {
      maxRamSlider.addEventListener('input', () => {
        maxRamLabel.textContent = `${maxRamSlider.value} GB RAM`;
        if (minRamSlider && parseInt(minRamSlider.value, 10) > parseInt(maxRamSlider.value, 10)) {
          minRamSlider.value = maxRamSlider.value;
          if (minRamLabel) minRamLabel.textContent = `${minRamSlider.value} GB RAM`;
        }
      });
    }

    if (minRamSlider && minRamLabel) {
      minRamSlider.addEventListener('input', () => {
        if (maxRamSlider && parseInt(minRamSlider.value, 10) > parseInt(maxRamSlider.value, 10)) {
          maxRamSlider.value = minRamSlider.value;
          if (maxRamLabel) maxRamLabel.textContent = `${maxRamSlider.value} GB RAM`;
        }
        minRamLabel.textContent = `${minRamSlider.value} GB RAM`;
      });
    }

    // Performance Presets
    const presetFlags = {
      aikar: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch',
      low_ram: '-XX:+UseSerialGC -XX:MinHeapFreeRatio=10 -XX:MaxHeapFreeRatio=20',
      modpack: '-XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 -XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15'
    };

    document.querySelectorAll('#form-ram-performance .core-card').forEach((card) => {
      card.addEventListener('click', () => {
        document.querySelectorAll('#form-ram-performance .core-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        const radio = card.querySelector('input');
        if (radio) radio.checked = true;

        const presetKey = card.getAttribute('data-preset');
        const ta = document.getElementById('setting-custom-jvm');
        if (ta && presetFlags[presetKey]) {
          ta.value = presetFlags[presetKey];
        }
      });
    });

    document.getElementById('form-visual-properties')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveVisualProperties();
    });

    document.getElementById('form-ram-performance')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveSystemRamSettings();
    });

    document.getElementById('btn-save-forge-jvm')?.addEventListener('click', () => {
      this.saveForgeJvmSettings();
    });

    document.getElementById('btn-save-raw-props')?.addEventListener('click', () => {
      this.saveRawProperties();
    });

    document.getElementById('btn-save-quick-settings')?.addEventListener('click', () => {
      this.saveQuickDashboardSettings();
    });
  }

  async loadProperties() {
    try {
      const res = await fetch('/api/config/properties');
      const data = await res.json();
      if (data.success && data.properties) {
        const p = data.properties;
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        const setCheck = (id, val) => { const el = document.getElementById(id); if (el) el.checked = (val === 'true'); };

        setVal('prop-motd', p['motd'] || '');
        const motdPreview = document.getElementById('motd-preview');
        if (motdPreview && p['motd']) {
          motdPreview.innerHTML = window.consoleManager?.formatMinecraftColors(window.consoleManager.escapeHtml(p['motd'])) || p['motd'];
        }

        setVal('prop-port', p['server-port'] || '25565');
        setVal('prop-max-players', p['max-players'] || '20');
        setVal('prop-gamemode', p['gamemode'] || 'survival');
        setVal('prop-difficulty', p['difficulty'] || 'normal');
        setVal('prop-view-distance', p['view-distance'] || '10');
        setVal('prop-simulation-distance', p['simulation-distance'] || '10');
        setVal('prop-spawn-protection', p['spawn-protection'] || '16');
        setVal('prop-level-seed', p['level-seed'] || '');

        setCheck('prop-online-mode', p['online-mode']);
        setCheck('prop-pvp', p['pvp'] ?? 'true');
        setCheck('prop-hardcore', p['hardcore'] ?? 'false');
        setCheck('prop-spawn-monsters', p['spawn-monsters'] ?? 'true');
        setCheck('prop-spawn-animals', p['spawn-animals'] ?? 'true');
        setCheck('prop-spawn-npcs', p['spawn-npcs'] ?? 'true');
        setCheck('prop-generate-structures', p['generate-structures'] ?? 'true');
        setCheck('prop-command-blocks', p['enable-command-block'] ?? 'true');
        setCheck('prop-allow-flight', p['allow-flight'] ?? 'false');
        setCheck('prop-allow-nether', p['allow-nether'] ?? 'true');
        setCheck('prop-whitelist', p['white-list'] ?? 'false');
        setCheck('prop-force-gamemode', p['force-gamemode'] ?? 'false');

        setCheck('quick-online-mode', p['online-mode']);
        setCheck('quick-pvp', p['pvp'] ?? 'true');
        setVal('quick-gamemode', p['gamemode'] || 'survival');
        setVal('quick-difficulty', p['difficulty'] || 'normal');
        setVal('quick-max-players', p['max-players'] || '20');
      }

      this.loadSystemSettings();

      const rawRes = await fetch('/api/config/properties/raw');
      const rawData = await rawRes.json();
      if (rawData.success) {
        const rawTa = document.getElementById('raw-properties-textarea');
        if (rawTa) rawTa.value = rawData.raw;
      }
    } catch (err) {}
  }

  async loadSystemSettings() {
    try {
      const res = await fetch('/api/config/system');
      const data = await res.json();
      if (data.success && data.settings) {
        const s = data.settings;
        const maxSlider = document.getElementById('setting-max-ram');
        const minSlider = document.getElementById('setting-min-ram');
        const customTa = document.getElementById('setting-custom-jvm');
        const autoRestart = document.getElementById('setting-auto-restart');
        const javaSel = document.getElementById('setting-java-path');
        const instSlider = document.getElementById('ram-slider');
        const instLabel = document.getElementById('ram-slider-value');

        const maxVal = s.maxRamGb || 10;
        const minVal = s.minRamGb || 4;

        if (maxSlider) {
          maxSlider.value = maxVal;
          const lbl = document.getElementById('setting-max-ram-label');
          if (lbl) lbl.textContent = `${maxVal} GB RAM`;
        }
        if (minSlider) {
          minSlider.value = minVal;
          const lbl = document.getElementById('setting-min-ram-label');
          if (lbl) lbl.textContent = `${minVal} GB RAM`;
        }
        if (instSlider) {
          instSlider.value = maxVal;
          if (instLabel) instLabel.textContent = `${maxVal} GB RAM`;
        }
        if (this.statRam && (!this.statRam.textContent || this.statRam.textContent.startsWith('0 MB / 4.0 GB'))) {
          this.statRam.textContent = `0 MB / ${maxVal}.0 GB`;
        }
        if (customTa && s.customJvmArgs) {
          customTa.value = s.customJvmArgs;
        }
        if (autoRestart) {
          autoRestart.checked = !!s.autoRestartOnCrash;
        }
        if (javaSel && s.javaPath) {
          javaSel.value = s.javaPath;
        }
      }
    } catch (e) {}
  }

  async saveSystemRamSettings() {
    const maxRam = parseInt(document.getElementById('setting-max-ram')?.value || '10', 10);
    const minRam = parseInt(document.getElementById('setting-min-ram')?.value || '4', 10);
    const javaPath = document.getElementById('setting-java-path')?.value || 'auto';
    const customJvm = document.getElementById('setting-custom-jvm')?.value || '';
    const autoRestart = document.getElementById('setting-auto-restart')?.checked || false;
    const preset = document.querySelector('input[name="jvm-preset"]:checked')?.value || 'aikar';

    try {
      const res = await fetch('/api/config/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maxRamGb: maxRam,
          minRamGb: minRam,
          javaPath,
          customJvmArgs: customJvm,
          autoRestartOnCrash: autoRestart,
          jvmPreset: preset
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      // Sync installer slider & labels
      const instSlider = document.getElementById('ram-slider');
      const instLabel = document.getElementById('ram-slider-value');
      if (instSlider) {
        instSlider.value = maxRam;
        if (instLabel) instLabel.textContent = `${maxRam} GB RAM`;
      }
      if (this.statRam && (this.serverStatus === 'OFFLINE' || this.serverStatus === 'KAPALI')) {
        this.statRam.textContent = `0 MB / ${maxRam}.0 GB`;
      }

      showToast(`RAM (${maxRam} GB) ve sistem ayarları başarıyla kaydedildi!`, 'success');
    } catch (err) {
      showToast(`Kaydetme hatası: ${err.message}`, 'error');
    }
  }

  async loadForgeJvm() {
    try {
      const res = await fetch('/api/config/forge-jvm');
      const data = await res.json();
      if (data.success) {
        const ta = document.getElementById('forge-jvm-textarea');
        if (ta) ta.value = data.content || '';
      }
    } catch (e) {}
  }

  async saveForgeJvmSettings() {
    const ta = document.getElementById('forge-jvm-textarea');
    if (!ta) return;
    try {
      const res = await fetch('/api/config/forge-jvm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ta.value })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('user_jvm_args.txt dosyası kaydedildi.', 'success');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async saveVisualProperties() {
    const getVal = (id) => document.getElementById(id)?.value;
    const getCheck = (id) => document.getElementById(id)?.checked ? 'true' : 'false';

    const props = {
      'motd': getVal('prop-motd'),
      'server-port': getVal('prop-port'),
      'max-players': getVal('prop-max-players'),
      'gamemode': getVal('prop-gamemode'),
      'difficulty': getVal('prop-difficulty'),
      'view-distance': getVal('prop-view-distance'),
      'simulation-distance': getVal('prop-simulation-distance'),
      'spawn-protection': getVal('prop-spawn-protection'),
      'level-seed': getVal('prop-level-seed') || '',
      'online-mode': getCheck('prop-online-mode'),
      'pvp': getCheck('prop-pvp'),
      'hardcore': getCheck('prop-hardcore'),
      'spawn-monsters': getCheck('prop-spawn-monsters'),
      'spawn-animals': getCheck('prop-spawn-animals'),
      'spawn-npcs': getCheck('prop-spawn-npcs'),
      'generate-structures': getCheck('prop-generate-structures'),
      'enable-command-block': getCheck('prop-command-blocks'),
      'allow-flight': getCheck('prop-allow-flight'),
      'allow-nether': getCheck('prop-allow-nether'),
      'white-list': getCheck('prop-whitelist'),
      'force-gamemode': getCheck('prop-force-gamemode')
    };

    try {
      const res = await fetch('/api/config/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: props })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Oyun ayarları kaydedildi. Uygulanması için sunucuyu yeniden başlatın.', 'success');
    } catch (err) {
      showToast(`Kaydetme hatası: ${err.message}`, 'error');
    }
  }

  async saveQuickDashboardSettings() {
    const props = {
      'online-mode': document.getElementById('quick-online-mode')?.checked ? 'true' : 'false',
      'pvp': document.getElementById('quick-pvp')?.checked ? 'true' : 'false',
      'gamemode': document.getElementById('quick-gamemode')?.value || 'survival',
      'difficulty': document.getElementById('quick-difficulty')?.value || 'normal',
      'max-players': document.getElementById('quick-max-players')?.value || '20'
    };

    try {
      const res = await fetch('/api/config/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ properties: props })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Hızlı ayarlar güncellendi.', 'success');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async saveRawProperties() {
    const ta = document.getElementById('raw-properties-textarea');
    if (!ta) return;
    try {
      const res = await fetch('/api/config/properties/raw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: ta.value })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('server.properties dosyası kaydedildi.', 'success');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  // -------------------------------------------------------------
  // Player Management
  // -------------------------------------------------------------
  initPlayers() {
    document.getElementById('btn-add-op')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-op');
      const name = input?.value.trim();
      if (!name) return;
      this.runConsoleCmd(`op ${name}`);
      input.value = '';
    });

    document.getElementById('btn-add-whitelist')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-whitelist');
      const name = input?.value.trim();
      if (!name) return;
      this.runConsoleCmd(`whitelist add ${name}`);
      input.value = '';
    });

    document.getElementById('btn-add-ban')?.addEventListener('click', () => {
      const input = document.getElementById('input-new-ban');
      const name = input?.value.trim();
      if (!name) return;
      this.runConsoleCmd(`ban ${name}`);
      input.value = '';
    });
  }

  async loadPlayers() {
    try {
      const res = await fetch('/api/config/players');
      const data = await res.json();
      if (data.success) {
        this.renderPlayerSublist('ops-list-container', data.ops, 'deop');
        this.renderPlayerSublist('whitelist-container', data.whitelist, 'whitelist remove');
        this.renderPlayerSublist('bans-container', data.bans, 'pardon');
      }
    } catch (e) {}
  }

  renderPlayerSublist(containerId, items, removeCmd) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!items || items.length === 0) {
      container.innerHTML = '<div class="empty-state-small">Liste boş.</div>';
      return;
    }

    container.innerHTML = '';
    for (const item of items) {
      const name = item.name || item;
      const card = document.createElement('div');
      card.className = 'player-card-item';
      card.innerHTML = `
        <div class="player-user-info">
          <img class="player-head-img" src="https://mc-heads.net/avatar/${encodeURIComponent(name)}/32" onerror="this.src='https://mc-heads.net/avatar/steve/32'">
          <span class="player-username">${name}</span>
        </div>
        <button class="btn btn-sm btn-danger" onclick="window.app.runConsoleCmd('${removeCmd} ${name}')">Kaldır</button>
      `;
      container.appendChild(card);
    }
  }

  runConsoleCmd(cmd) {
    fetch('/api/server/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    }).then(() => {
      showToast(`Komut uygulandı: ${cmd}`, 'success');
      setTimeout(() => this.loadPlayers(), 1500);
    });
  }

  // -------------------------------------------------------------
  // File & Plugin Explorer
  // -------------------------------------------------------------
  initFiles() {
    document.getElementById('btn-refresh-files')?.addEventListener('click', () => {
      this.loadFiles(this.currentFilePath);
    });

    document.getElementById('btn-new-folder')?.addEventListener('click', () => {
      const name = prompt('Yeni klasör adı:');
      if (!name) return;
      fetch('/api/files/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: this.currentFilePath, folderName: name })
      }).then(() => this.loadFiles(this.currentFilePath));
    });

    const fileUploadInput = document.getElementById('file-upload-input');
    if (fileUploadInput) {
      fileUploadInput.addEventListener('change', async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const formData = new FormData();
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }

        showToast(`${files.length} dosya yükleniyor...`, 'info');
        try {
          const res = await fetch(`/api/files/upload?path=${encodeURIComponent(this.currentFilePath)}`, {
            method: 'POST',
            body: formData
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error);
          showToast('Dosyalar yüklendi.', 'success');
          this.loadFiles(this.currentFilePath);
        } catch (err) {
          showToast(`Yükleme hatası: ${err.message}`, 'error');
        }
      });
    }

    document.getElementById('btn-close-editor')?.addEventListener('click', () => this.closeFileEditor());
    document.getElementById('btn-cancel-editor')?.addEventListener('click', () => this.closeFileEditor());
    document.getElementById('btn-save-file-editor')?.addEventListener('click', () => this.saveCurrentOpenFile());
  }

  async loadFiles(relPath = '') {
    this.currentFilePath = relPath;
    this.renderBreadcrumbs(relPath);

    const tbody = document.getElementById('files-tbody');
    if (!tbody) return;

    try {
      const res = await fetch(`/api/files/list?path=${encodeURIComponent(relPath)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.files.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Bu klasör boş.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      for (const file of data.files) {
        const tr = document.createElement('tr');
        const icon = file.isDirectory ? '📁' : (file.name.endsWith('.jar') ? '☕' : '📄');
        tr.innerHTML = `
          <td>
            <div class="file-name-cell" onclick="window.app.handleFileClick('${file.path}', ${file.isDirectory})">
              <span>${icon}</span>
              <strong>${file.name}</strong>
            </div>
          </td>
          <td>${file.sizeFormatted}</td>
          <td>${file.modified ? new Date(file.modified).toLocaleString() : '-'}</td>
          <td class="text-right">
            ${!file.isDirectory && this.isTextFile(file.name) ? `<button class="btn btn-sm btn-outline" onclick="window.app.openFileEditor('${file.path}')">Düzenle</button>` : ''}
            <button class="btn btn-sm btn-danger" onclick="window.app.deleteFile('${file.path}')">Sil</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Hata: ${err.message}</td></tr>`;
    }
  }

  renderBreadcrumbs(relPath) {
    const bc = document.getElementById('file-breadcrumbs');
    if (!bc) return;
    bc.innerHTML = '<span class="crumb-item" onclick="window.app.loadFiles(\'\')">server_data</span>';

    if (!relPath) return;
    const parts = relPath.split('/');
    let accum = '';
    for (const part of parts) {
      accum = accum ? `${accum}/${part}` : part;
      const cur = accum;
      const span = document.createElement('span');
      span.innerHTML = ` / <span class="crumb-item" onclick="window.app.loadFiles('${cur}')">${part}</span>`;
      bc.appendChild(span);
    }
  }

  isTextFile(filename) {
    const exts = ['.yml', '.yaml', '.properties', '.json', '.txt', '.toml', '.log', '.md', '.cfg', '.conf'];
    return exts.some(e => filename.toLowerCase().endsWith(e));
  }

  handleFileClick(path, isDir) {
    if (isDir) {
      this.loadFiles(path);
    } else if (this.isTextFile(path)) {
      this.openFileEditor(path);
    }
  }

  async openFileEditor(filePath) {
    try {
      const res = await fetch(`/api/files/read?path=${encodeURIComponent(filePath)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      this.currentEditingPath = filePath;
      document.getElementById('editor-filename').textContent = `Düzenle: ${filePath}`;
      document.getElementById('file-editor-textarea').value = data.content;
      document.getElementById('file-editor-modal').style.display = 'flex';
    } catch (err) {
      showToast(`Dosya açılamadı: ${err.message}`, 'error');
    }
  }

  closeFileEditor() {
    document.getElementById('file-editor-modal').style.display = 'none';
  }

  async saveCurrentOpenFile() {
    if (!this.currentEditingPath) return;
    const content = document.getElementById('file-editor-textarea').value;

    try {
      const res = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: this.currentEditingPath, content })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Dosya kaydedildi.', 'success');
      this.closeFileEditor();
    } catch (err) {
      showToast(`Kaydetme hatası: ${err.message}`, 'error');
    }
  }

  async deleteFile(filePath) {
    if (!confirm(`"${filePath}" dosyasını / klasörünü silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/files/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Silindi.', 'success');
      this.loadFiles(this.currentFilePath);
    } catch (err) {
      showToast(`Silme hatası: ${err.message}`, 'error');
    }
  }

  // -------------------------------------------------------------
  // World Backups
  // -------------------------------------------------------------
  initBackups() {
    document.getElementById('btn-create-backup')?.addEventListener('click', async () => {
      showToast('Dünya yedeği (.zip) oluşturuluyor...', 'info');
      try {
        const res = await fetch('/api/backups/create', { method: 'POST' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);
        showToast('Yedek başarıyla oluşturuldu!', 'success');
        this.loadBackups();
      } catch (err) {
        showToast(`Yedekleme hatası: ${err.message}`, 'error');
      }
    });
  }

  async loadBackups() {
    const tbody = document.getElementById('backups-tbody');
    if (!tbody) return;

    try {
      const res = await fetch('/api/backups/list');
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.backups.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Henüz oluşturulmuş bir yedek bulunmuyor.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      for (const b of data.backups) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>📦 ${b.name}</strong></td>
          <td>${b.sizeFormatted}</td>
          <td>${new Date(b.createdAt).toLocaleString()}</td>
          <td class="text-right">
            <a href="/api/backups/download/${encodeURIComponent(b.name)}" class="btn btn-sm btn-outline">İndir</a>
            <button class="btn btn-sm btn-warning" onclick="window.app.restoreBackup('${b.name}')">Geri Yükle</button>
            <button class="btn btn-sm btn-danger" onclick="window.app.deleteBackup('${b.name}')">Sil</button>
          </td>
        `;
        tbody.appendChild(tr);
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Hata: ${err.message}</td></tr>`;
    }
  }

  async restoreBackup(name) {
    if (!confirm(`"${name}" yedeğini geri yüklemek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Yedek başarıyla geri yüklendi!', 'success');
    } catch (err) {
      showToast(`Geri yükleme hatası: ${err.message}`, 'error');
    }
  }

  async deleteBackup(name) {
    if (!confirm(`"${name}" yedeğini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch('/api/backups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Yedek silindi.', 'success');
      this.loadBackups();
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new MinecraftApp();
});
