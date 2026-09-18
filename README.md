# 🌸 Sakura Minecraft Server & Web Management Panel

<p align="center">
  <a href="#english"><strong>English</strong></a> •
  <a href="#türkçe"><strong>Türkçe</strong></a>
</p>

---

<a name="english"></a>
# 🇬🇧 English

Modern, aesthetic, and robust web-based Minecraft Forge & Vanilla server management panel. Equipped with **Playit.gg tunneling** for port-forwardless multiplayer, **Modrinth mod integration**, live interactive console, and **world backup management**.

> **Developer / Author:** Sami Kahraman  
> **License:** MIT  
> **Version:** v1.1.0  

---

## ✨ Features

- 🖥️ **Sakura-Themed Modern UI:** Dark mode, smooth animations, sakura petal effects, and premium glassmorphism styling.
- 🌐 **Integrated Playit.gg Tunneling:** Share your server globally without opening ports on your router. Copy public IP with one click.
- ⚡ **Live Interactive Console:** Real-time server log streaming, auto-scroll toggle, and instant Minecraft command execution.
- 🧩 **Mod Manager & Modrinth Integration:** Search Forge mods directly via Modrinth, install in one click, enable or disable mods easily.
- 🌍 **World & Backup Manager:** Manage server worlds, generate one-click `.zip` backups, or restore previous backups on the fly.
- ⚙️ **Server & JVM Optimization:** Visual configuration for RAM allocations, Aikar's Flags, modpack JVM presets, and `server.properties`.
- 👥 **Player Management:** Handle server operators (OP), ban list, and whitelists conveniently from the dashboard.
- 📥 **Built-in Installer:** Download and install Vanilla or Forge server cores automatically directly from the panel.

---

## 🚀 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or newer recommended)
- [Java Runtime Environment](https://adoptium.net/) (Java 8, 17, or 21 depending on your Minecraft version)

---

## 🛠️ Installation & Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/minecraft-server-panel.git
cd minecraft-server-panel
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start the Panel

**On Windows (Quick Launcher):**
Double-click `start_panel.bat` to launch.

**Via Command Line:**
```bash
npm start
```

The panel will open at **http://localhost:3000** by default.

---

## 📂 Directory Structure

```text
├── bin/                    # Playit.gg binary directory (auto-downloaded by the panel)
├── public/                 # Frontend assets (HTML, CSS, Sakura effects, JS modules)
│   ├── css/                # Styling & theme definitions
│   ├── js/                 # Client-side logic (Console, Playit, Mod manager, etc.)
│   └── assets/             # Images and decorative vectors
├── server/                 # Express backend & WebSocket server
│   ├── app.js              # Main server and API routes
│   ├── minecraftProcess.js # Minecraft child process controller
│   ├── playitProcess.js    # Playit tunnel lifecycle manager
│   ├── modManager.js       # Modrinth API integration & installer
│   ├── backupManager.js    # Zip backup engine
│   ├── configManager.js    # Settings & server.properties parser
│   └── installer.js        # Forge / Vanilla automated downloader
├── server_data/            # Minecraft server runtime folder (excluded from git)
├── backups/                # Server & world zip backups (excluded from git)
├── package.json            # Node.js dependencies & scripts
├── serverSettings.json     # Web panel runtime configurations
└── start_panel.bat         # One-click Windows runner
```

---

## 👨‍💻 Author

- **Sami Kahraman**

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---
---

<a name="türkçe"></a>
# 🇹🇷 Türkçe

Modern, şık ve güçlü bir web tabanlı Minecraft Forge & Vanilla sunucu yönetim paneli. Port açmaya gerek kalmadan tüm dünyayla oynamanızı sağlayan **Playit.gg tünelleme** entegrasyonu, **Modrinth mod pazarı** ve **dünya yedekleme** sistemi ile birlikte gelir.

> **Geliştirici / Yapımcı:** Sami Kahraman  
> **Lisans:** MIT  
> **Sürüm:** v1.1.0  

---

## ✨ Özellikler

- 🖥️ **Modern Sakura Arayüzü:** Koyu tema, akıcı animasyonlar, sakura yaprağı efektleri ve glassmorphism tasarım.
- 🌐 **Playit.gg Entegre Tünelleme:** Modemden port yönlendirme (Port Forwarding) yapmadan sunucunuzu anında internete açın, tek tıkla IP kopyalayın.
- ⚡ **Canlı Konsol:** Web üzerinden canlı sunucu günlükleri, otomatik kaydırma ve anlık Minecraft komutu gönderme.
- 🧩 **Mod Yöneticisi & Modrinth Entegrasyonu:** Modrinth üzerinden Forge modlarını arayın, tek tıkla indirin, etkinleştirin veya devre dışı bırakın.
- 🌍 **Dünya & Yedek Yöneticisi:** Sunucu dünyalarını yönetin, tek tıkla `.zip` olarak yedekleyin veya eski yedeklere anında geri dönün.
- ⚙️ **Sunucu & JVM Optimizasyonu:** RAM sınırları, Aikar Flag'leri, modpack hazır JVM profilleri ve `server.properties` ayarlarını görsel olarak düzenleyin.
- 👥 **Oyuncu Yönetimi:** Oyuncuları OP yapma, banlama, beyaz listeye (whitelist) ekleme/çıkarma işlemlerini arayüzden yönetin.
- 📥 **Otomatik Kurulum (Installer):** Vanilla veya Forge sürümlerini panel içerisinden otomatik olarak indirin ve kurun.

---

## 🚀 Gereksinimler

- [Node.js](https://nodejs.org/) (v18 veya üzeri önerilir)
- [Java Runtime Environment](https://adoptium.net/) (Minecraft sürümünüze uygun Java 8, 17 veya 21)

---

## 🛠️ Kurulum & Çalıştırma

### 1. Projeyi Klonlayın
```bash
git clone https://github.com/KULLANICI_ADINIZ/minecraft-server-panel.git
cd minecraft-server-panel
```

### 2. Bağımlılıkları Yükleyin
```bash
npm install
```

### 3. Paneli Başlatın

**Windows için (Hızlı Başlatıcı):**
Çift tıklayarak `start_panel.bat` dosyasını çalıştırabilirsiniz.

**Konsol üzerinden:**
```bash
npm start
```

Panel varsayılan olarak **http://localhost:3000** adresinde açılacaktır.

---

## 📂 Proje Dizin Yapısı

```text
├── bin/                    # Playit.gg yürütülebilir dosyası (panel otomatik indirebilir)
├── public/                 # Web arayüzü (HTML, CSS, Sakura efektleri, JavaScript modülleri)
│   ├── css/                # Stil dosyaları
│   ├── js/                 # Panel ön yüz mantığı (Konsol, Playit, Mod yönetimi vb.)
│   └── assets/             # Görseller ve ikonlar
├── server/                 # Node.js Express backend ve WebSocket sunucusu
│   ├── app.js              # Ana sunucu ve API yönlendirmeleri
│   ├── minecraftProcess.js # Minecraft sunucu süreci yönetimi
│   ├── playitProcess.js    # Playit tünel yöneticisi
│   ├── modManager.js       # Modrinth API & Mod yükleyici
│   ├── backupManager.js    # Yedekleme motoru
│   ├── configManager.js    # Ayar ve server.properties yöneticisi
│   └── installer.js        # Forge ve Vanilla sürüm indiricisi
├── server_data/            # Minecraft sunucu çalışma klasörü (git takibi dışındadır)
├── backups/                # Alınan sunucu yedekleri (git takibi dışındadır)
├── package.json            # Proje bağımlılıkları ve meta verileri
├── serverSettings.json     # Panel sistem ayarları
└── start_panel.bat         # Tek tıkla başlatıcı
```

---

## 👨‍💻 Yapımcı

- **Sami Kahraman**

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
