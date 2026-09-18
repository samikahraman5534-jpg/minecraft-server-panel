class PlayitUIHandler {
  constructor() {
    this.heroStatusPill = document.getElementById('playit-hero-status-pill');
    this.navPill = document.getElementById('playit-nav-pill');
    this.tabStatusPill = document.getElementById('playit-tab-status-pill');
    this.toggleBtn = document.getElementById('btn-playit-toggle');
    this.tabStartBtn = document.getElementById('btn-playit-tab-start');
    this.tabStopBtn = document.getElementById('btn-playit-tab-stop');
    this.downloadBtn = document.getElementById('btn-playit-download');
    this.resetBtn = document.getElementById('btn-playit-reset');
    this.copyIpBtn = document.getElementById('btn-copy-ip');
    this.displayIp = document.getElementById('display-server-ip');
    this.claimBanner = document.getElementById('playit-claim-banner');
    this.claimLinkBtn = document.getElementById('playit-claim-link-btn');
    this.stateTxt = document.getElementById('playit-state-txt');
    this.fileStatus = document.getElementById('playit-file-status');
    this.addressValue = document.getElementById('playit-address-value');
    this.claimStatus = document.getElementById('playit-claim-status');
    this.consoleOutput = document.getElementById('playit-console-output');
    this.clearConsoleBtn = document.getElementById('btn-clear-playit-console');
    this.dlBox = document.getElementById('playit-download-box');
    this.dlBar = document.getElementById('playit-dl-bar');
    this.dlPercent = document.getElementById('playit-dl-percent');

    this.currentAddress = null;
    this.status = 'STOPPED';

    this.init();
  }

  init() {
    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggle());
    }
    if (this.tabStartBtn) {
      this.tabStartBtn.addEventListener('click', () => this.start());
    }
    if (this.tabStopBtn) {
      this.tabStopBtn.addEventListener('click', () => this.stop());
    }
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.download());
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.reset());
    }
    if (this.copyIpBtn) {
      this.copyIpBtn.addEventListener('click', () => this.copyAddress());
    }
    if (this.clearConsoleBtn) {
      this.clearConsoleBtn.addEventListener('click', () => {
        if (this.consoleOutput) this.consoleOutput.innerHTML = '<div class="console-line system-line">[Playit] Konsol temizlendi.</div>';
      });
    }
  }

  update(data) {
    if (!data) return;
    this.status = data.status || 'STOPPED';
    const isRunning = this.status === 'RUNNING';
    const isStarting = this.status === 'STARTING' || this.status === 'DOWNLOADING';
    const isClaim = this.status === 'NEEDS_CLAIM';

    const domain = data.customDomain || data.publicAddress || (data.tunnels && data.tunnels[0]) || (isRunning ? 'Adres alınıyor...' : 'Tünel Kapalı (Playit Başlatın)');
    this.currentAddress = domain;

    // File status
    if (this.fileStatus) {
      this.fileStatus.textContent = data.isInstalled ? 'Yüklü (bin/playit.exe)' : 'Yüklü Değil';
      this.fileStatus.style.color = data.isInstalled ? '#6ee7b7' : '#f87171';
    }

    // Status Pills
    const pillText = isRunning ? '🟢 Aktif' : (isClaim ? 'Eşleme Bekliyor' : (isStarting ? 'Başlatılıyor...' : '🔴 Kapalı'));
    const pillClass = isRunning ? 'pill-online' : (isClaim ? 'pill-warn' : (isStarting ? 'pill-warn' : 'pill-offline'));

    if (this.heroStatusPill) {
      this.heroStatusPill.textContent = pillText;
      this.heroStatusPill.className = `pill ${pillClass}`;
    }
    if (this.tabStatusPill) {
      this.tabStatusPill.textContent = isRunning ? 'Tünel Aktif' : (isClaim ? 'Eşleme Bekliyor' : (isStarting ? 'Başlatılıyor...' : 'Tünel Kapalı'));
      this.tabStatusPill.className = `pill ${pillClass}`;
    }
    if (this.navPill) {
      this.navPill.textContent = isRunning ? 'Online' : (isClaim ? 'Claim' : 'Offline');
      this.navPill.className = `playit-mini-pill ${isRunning ? 'active' : ''}`;
    }
    if (this.stateTxt) {
      this.stateTxt.textContent = isRunning ? 'Aktif' : (isStarting ? 'Başlatılıyor...' : 'Kapalı');
      this.stateTxt.style.color = isRunning ? '#6ee7b7' : 'var(--text-muted)';
    }

    // Toggle button text (in Playit tab)
    if (this.toggleBtn) {
      this.toggleBtn.textContent = isRunning || isStarting || isClaim ? 'Tüneli Durdur' : 'Tüneli Başlat';
      this.toggleBtn.className = isRunning || isStarting || isClaim ? 'btn btn-sm btn-danger' : 'btn btn-sm btn-accent';
    }

    if (this.tabStartBtn && this.tabStopBtn) {
      this.tabStartBtn.style.display = isRunning || isStarting || isClaim ? 'none' : 'inline-flex';
      this.tabStopBtn.style.display = isRunning || isStarting || isClaim ? 'inline-flex' : 'none';
    }

    // IP Address display - ALWAYS show the custom domain cleanly
    if (this.displayIp) {
      this.displayIp.textContent = this.currentAddress;
      this.displayIp.style.color = '#6ee7b7';
    }

    if (this.addressValue) {
      this.addressValue.textContent = this.currentAddress;
    }

    // Claim banner
    if (this.claimBanner && this.claimLinkBtn) {
      if (data.claimUrl) {
        this.claimBanner.style.display = 'flex';
        this.claimLinkBtn.href = data.claimUrl;
        if (this.claimStatus) this.claimStatus.textContent = 'Eşleme Linki Üretildi';
      } else {
        this.claimBanner.style.display = 'none';
        if (this.claimStatus) this.claimStatus.textContent = isRunning ? 'Eşlendi & Aktif' : 'Beklemede';
      }
    }
  }

  appendLog(logObj) {
    if (!this.consoleOutput) return;
    const text = typeof logObj === 'string' ? logObj : logObj.text;
    if (!text) return;

    const line = document.createElement('div');
    line.className = 'console-line';
    if (text.toLowerCase().includes('error')) line.className += ' error';
    else if (text.toLowerCase().includes('warn')) line.className += ' warn';
    else if (text.includes('claim') || text.includes('tunnel')) line.className += ' player';
    else line.className += ' info';

    line.textContent = text;
    this.consoleOutput.appendChild(line);
    this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
  }

  async toggle() {
    if (this.status === 'RUNNING' || this.status === 'STARTING' || this.status === 'NEEDS_CLAIM') {
      await this.stop();
    } else {
      await this.start();
    }
  }

  async start() {
    try {
      showToast('Playit.gg tüneli başlatılıyor...', 'info');
      const res = await fetch('/api/playit/start', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Playit.gg tünel ajanı çalıştırıldı.', 'success');
    } catch (err) {
      showToast(`Playit başlatılamadı: ${err.message}`, 'error');
    }
  }

  async stop() {
    try {
      const res = await fetch('/api/playit/stop', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Playit.gg tüneli durduruldu.', 'info');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  async download() {
    try {
      if (this.dlBox) this.dlBox.style.display = 'block';
      showToast('Playit.exe indiriliyor...', 'info');
      const res = await fetch('/api/playit/download', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Playit.exe başarıyla indirildi.', 'success');
      if (this.dlBox) this.dlBox.style.display = 'none';
    } catch (err) {
      showToast(`İndirme hatası: ${err.message}`, 'error');
      if (this.dlBox) this.dlBox.style.display = 'none';
    }
  }

  async reset() {
    if (!confirm('Playit hesap eşlemesini sıfırlamak istediğinize emin misiniz?')) return;
    try {
      const res = await fetch('/api/playit/reset', { method: 'POST' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      showToast('Playit kimlik bilgileri sıfırlandı.', 'success');
    } catch (err) {
      showToast(`Hata: ${err.message}`, 'error');
    }
  }

  copyAddress() {
    if (!this.currentAddress) {
      showToast('Henüz aktif bir Playit IP adresi bulunmuyor. Önce tüneli başlatın!', 'error');
      return;
    }
    navigator.clipboard.writeText(this.currentAddress).then(() => {
      showToast(`Sunucu adresi kopyalandı: ${this.currentAddress}`, 'success');
    }).catch(() => {
      prompt('Sunucu adresi:', this.currentAddress);
    });
  }
}

window.playitUI = new PlayitUIHandler();
