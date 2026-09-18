class ConsoleManager {
  constructor() {
    this.output = document.getElementById('console-output');
    this.input = document.getElementById('console-input');
    this.form = document.getElementById('console-form');
    this.autoScrollCheck = document.getElementById('console-autoscroll');
    this.clearBtn = document.getElementById('btn-clear-console');
    this.downloadBtn = document.getElementById('btn-download-logs');
    this.logBadge = document.getElementById('log-count-badge');
    
    this.history = [];
    this.historyIndex = -1;
    this.maxLines = 1000;
    this.logCount = 0;

    this.init();
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendCommand();
      });
    }

    if (this.input) {
      this.input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.navigateHistory(-1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.navigateHistory(1);
        }
      });
    }

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => this.clear());
    }

    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadLogs());
    }

    // Macro buttons
    document.querySelectorAll('.macro-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.getAttribute('data-cmd');
        if (cmd.endsWith(' ')) {
          this.input.value = cmd;
          this.input.focus();
        } else {
          this.input.value = cmd;
          this.sendCommand();
        }
      });
    });
  }

  appendLine(logObj) {
    if (!this.output) return;
    const text = typeof logObj === 'string' ? logObj : logObj.text;
    if (!text) return;

    const lineElem = document.createElement('div');
    lineElem.className = 'console-line ' + this.classifyLine(text);
    lineElem.innerHTML = this.formatMinecraftColors(this.escapeHtml(text));

    this.output.appendChild(lineElem);
    this.logCount++;
    if (this.logBadge) this.logBadge.textContent = this.logCount;

    // Prune old lines if exceeding maxLines
    while (this.output.children.length > this.maxLines) {
      this.output.removeChild(this.output.firstChild);
    }

    if (this.autoScrollCheck && this.autoScrollCheck.checked) {
      this.output.scrollTop = this.output.scrollHeight;
    }
  }

  classifyLine(text) {
    const lower = text.toLowerCase();
    if (lower.includes('error') || lower.includes('exception') || lower.includes('fatal')) return 'error';
    if (lower.includes('warn')) return 'warn';
    if (lower.includes('joined the game') || lower.includes('left the game')) return 'player';
    if (lower.includes('info')) return 'info';
    if (lower.startsWith('>')) return 'system-line';
    return '';
  }

  formatMinecraftColors(str) {
    if (!str) return '';
    const colorHex = {
      '0': '#1e1e1e', '1': '#0000aa', '2': '#00aa00', '3': '#00aaaa',
      '4': '#aa0000', '5': '#aa00aa', '6': '#ffaa00', '7': '#aaaaaa',
      '8': '#555555', '9': '#5555ff', 'a': '#55ff55', 'b': '#55ffff',
      'c': '#ff5555', 'd': '#ff55ff', 'e': '#ffff55', 'f': '#ffffff'
    };

    let text = this.escapeHtml(str).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

    let html = '';
    let isBold = false;
    let isItalic = false;
    let isUnderline = false;
    let isStrike = false;
    let currentColor = '#ffffff';

    const parts = text.split(/(&amp;|§|&)([0-9a-fk-or])/gi);

    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === '&amp;' || parts[i] === '§' || parts[i] === '&') {
        const code = (parts[i + 1] || '').toLowerCase();
        i++;

        if (colorHex[code]) {
          currentColor = colorHex[code];
          isBold = false;
          isItalic = false;
          isUnderline = false;
          isStrike = false;
        } else if (code === 'l') {
          isBold = true;
        } else if (code === 'o') {
          isItalic = true;
        } else if (code === 'n') {
          isUnderline = true;
        } else if (code === 'm') {
          isStrike = true;
        } else if (code === 'r') {
          currentColor = '#ffffff';
          isBold = false;
          isItalic = false;
          isUnderline = false;
          isStrike = false;
        }
        continue;
      }

      const content = parts[i];
      if (content) {
        let style = `color: ${currentColor};`;
        if (isBold) style += ' font-weight: bold;';
        if (isItalic) style += ' font-style: italic;';
        const decor = [];
        if (isUnderline) decor.push('underline');
        if (isStrike) decor.push('line-through');
        if (decor.length) style += ` text-decoration: ${decor.join(' ')};`;

        html += `<span style="${style}">${content}</span>`;
      }
    }

    return html || text;
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  sendCommand() {
    if (!this.input) return;
    const cmd = this.input.value.trim();
    if (!cmd) return;

    this.history.push(cmd);
    this.historyIndex = this.history.length;

    if (window.appWs && window.appWs.readyState === WebSocket.OPEN) {
      window.appWs.send(JSON.stringify({ type: 'command', command: cmd }));
    } else {
      fetch('/api/server/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      }).catch((err) => {
        this.appendLine(`[WebPanel Error] Komut gönderilemedi: ${err.message}`);
      });
    }

    this.input.value = '';
  }

  navigateHistory(direction) {
    if (this.history.length === 0) return;
    this.historyIndex += direction;
    if (this.historyIndex < 0) this.historyIndex = 0;
    if (this.historyIndex > this.history.length) this.historyIndex = this.history.length;

    if (this.historyIndex === this.history.length) {
      this.input.value = '';
    } else {
      this.input.value = this.history[this.historyIndex];
    }
  }

  clear() {
    if (this.output) {
      this.output.innerHTML = '<div class="console-line system-line">[WebPanel] Konsol temizlendi.</div>';
      this.logCount = 0;
      if (this.logBadge) this.logBadge.textContent = '0';
    }
  }

  downloadLogs() {
    if (!this.output) return;
    const text = this.output.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `minecraft-console-${new Date().toISOString().slice(0, 19)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

window.consoleManager = new ConsoleManager();
