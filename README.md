# 🌸 Sakura Minecraft Server & Web Management Panel

<p align="center">
  <img src="public/assets/favicon.svg" alt="Sakura Logo" width="96" height="96" />
</p>

<p align="center">
  <strong>Modern, Full-Featured Web Management Dashboard for Minecraft Forge & Vanilla Servers with Built-In Playit.gg Tunneling.</strong>
</p>

<p align="center">
  <a href="#english"><strong>🇬🇧 English</strong></a> •
  <a href="#türkçe"><strong>🇹🇷 Türkçe</strong></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express.js" />
  <img src="https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white" alt="WebSocket" />
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
  <img src="https://img.shields.io/badge/Minecraft-358A38?style=for-the-badge&logo=minecraft&logoColor=white" alt="Minecraft" />
  <img src="https://img.shields.io/badge/Minecraft%20Forge-DFA044?style=for-the-badge&logo=curseforge&logoColor=white" alt="Forge" />
  <img src="https://img.shields.io/badge/Java-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java" />
  <img src="https://img.shields.io/badge/Modrinth-API-00AF5C?style=for-the-badge&logo=modrinth&logoColor=white" alt="Modrinth" />
  <img src="https://img.shields.io/badge/Playit.gg-Tunneling-blueviolet?style=for-the-badge" alt="Playit.gg" />
  <img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge" alt="MIT License" />
</p>

---

<a name="english"></a>
# 🇬🇧 English Documentation

## 📖 Overview
**Sakura Minecraft Server & Web Panel** is an all-in-one, zero-friction Minecraft server deployment and administration system. It bridges the gap between running local game servers and managing professional web hosting dashboards. With native **Playit.gg tunneling**, you do not need port forwarding or a static IP to play with your friends worldwide.

> **Lead Developer / Author:** Sami Kahraman  
> **License:** MIT  
> **Version:** v1.1.0  

---

## 🏗️ Architecture Diagram

```mermaid
graph TD
    Client["🌐 Web Browser (Admin Dashboard)"]
    
    subgraph Frontend ["Frontend (Glassmorphism & Vanilla CSS)"]
        Dashboard["Dashboard & Realtime Metrics"]
        ConsoleUI["Interactive Live Console"]
        PlayitUI["Playit.gg Tunnel Manager"]
        ModUI["Modrinth Mod Store & Manager"]
        ConfigUI["Server Config & Color MOTD Builder"]
        BackupUI["World & Backup Manager"]
    end

    subgraph Backend ["Node.js Backend & API Core"]
        Express["Express HTTP Server (REST Endpoints)"]
        WSS["WebSocket Server (Live Streams)"]
        MCProcess["Minecraft Process Controller"]
        PlayitProc["Playit Tunnel Agent Manager"]
        ModMgr["Modrinth API Engine"]
        BackupMgr["Zip & Compression Engine"]
        ConfigMgr["Properties & System Settings Parser"]
        Installer["Forge / Vanilla Automated Downloader"]
    end

    subgraph External ["External Services & Runtimes"]
        PlayitNet["☁️ Playit.gg Tunnel Network"]
        ModrinthNet["📦 Modrinth Mod Repository"]
        MojangNet["📥 Mojang / Forge Official Download Servers"]
        MCServerJar["☕ Java Minecraft Server Runtime (Child Process)"]
    end

    Client <-->|REST API / JSON| Express
    Client <-->|Bi-directional WebSocket| WSS

    Express --> MCProcess
    Express --> PlayitProc
    Express --> ModMgr
    Express --> BackupMgr
    Express --> ConfigMgr
    Express --> Installer

    WSS <-->|Realtime Stdout / RAM / CPU / Players| MCProcess
    WSS <-->|Tunnel State & Public Domain| PlayitProc

    MCProcess <-->|STDIN / STDOUT / pidusage| MCServerJar
    PlayitProc <-->|Local 25565 <-> Cloud Public IP| PlayitNet
    ModMgr <-->|Search & Install Mods| ModrinthNet
    Installer <-->|Official Version Retrieval| MojangNet
```

---

## 🛠️ Technology Stack

| Component | Technology | Description |
| :--- | :--- | :--- |
| **Backend Runtime** | ![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) | Asynchronous, non-blocking backend server |
| **Web Framework** | ![Express.js](https://img.shields.io/badge/-Express.js-000000?style=flat&logo=express&logoColor=white) | Fast, unopinionated REST API routing |
| **Realtime Stream** | ![WebSocket](https://img.shields.io/badge/-WebSocket-010101?style=flat&logo=socketdotio&logoColor=white) | Sub-millisecond bi-directional logs & metrics |
| **Tunneling** | ![Playit.gg](https://img.shields.io/badge/-Playit.gg-blueviolet?style=flat) | Router-free global port tunneling |
| **Mod Ecosystem** | ![Modrinth](https://img.shields.io/badge/-Modrinth%20API-00AF5C?style=flat&logo=modrinth&logoColor=white) | Official Modrinth REST API integration |
| **Process Monitoring**| `pidusage` | Real-time CPU & memory utilization tracking |
| **Game Runtime** | ![Java](https://img.shields.io/badge/-Java%20JRE-ED8B00?style=flat&logo=openjdk&logoColor=white) | OpenJDK / Adoptium Hotspot JVM |
| **Game Engine** | ![Minecraft Forge](https://img.shields.io/badge/-Minecraft%20Forge-DFA044?style=flat&logo=curseforge&logoColor=white) | Vanilla & Forge 1.7.10 - 1.21.x compatibility |

---

## ✨ Key Features

1. 🌐 **Zero Port-Forwarding (Playit.gg):**
   - Automatically detects system Playit agents or downloads a standalone client.
   - Dynamically extracts public tunnel domains (`*.ply.gg`, `*.joinmc.link`).
2. ⚡ **Interactive Live Console:**
   - Real-time Minecraft console logs with ANSI / Minecraft color code rendering.
   - Command history, autoscroll toggle, and instant command dispatching.
3. 🎨 **Interactive Color MOTD Builder:**
   - Full 16-color palette picker (`&0`–`&f`), bold (`&l`), italic (`&o`), and underline (`&n`).
   - Live Minecraft Multiplayer Server List card preview with signal bars and ping simulation.
4. 🧩 **1-Click Mod Manager:**
   - Search Forge mods via Modrinth without leaving the dashboard.
   - Enable, disable, or delete mod files with a single toggle.
5. 🛡️ **Fail-Safe Turnkey Design:**
   - Automatic EULA acceptance, memory overflow guards, and JVM flags optimization (Aikar's flags).

---

## 🚀 Quick Start Guide

### 1. Requirements
- **[Node.js](https://nodejs.org/)** (v18.0.0 or higher)
- **[Java JRE/JDK](https://adoptium.net/)** (Java 17 or 21)

### 2. Run the Panel
**On Windows:** Simply double-click `start_panel.bat`.  
*(It will install dependencies automatically on first run and launch the browser at `http://localhost:3000`).*

**Via Command Line:**
```bash
npm install
npm start
```

### 3. Deploy Your Server
1. Go to **"Version & Installer"** tab and pick **Forge** or **Vanilla**.
2. Click **"Start Installation"**.
3. Head to **"Dashboard"** and click **"Start Server"**!

---

## 👨‍💻 Author & License
- **Author:** Sami Kahraman
- **License:** [MIT License](LICENSE)

---
---

<a name="türkçe"></a>
# 🇹🇷 Türkçe Dokümantasyon

## 📖 Genel Bakış
**Sakura Minecraft Sunucu & Web Yönetim Paneli**, yerel bilgisayarınızda bir Minecraft sunucusu barındırmayı profesyonel bir web hosting paneli deneyimine dönüştüren modern bir yönetim arayüzüdür. Dahili **Playit.gg tünelleme sistemi** sayesinde modeminizden port açmaya (port forwarding) veya statik IP satın almaya gerek kalmadan tüm dünyadaki arkadaşlarınızla anında oynayabilirsiniz.

> **Baş Geliştirici / Yapımcı:** Sami Kahraman  
> **Lisans:** MIT  
> **Sürüm:** v1.1.0  

---

## 🏗️ Mimari Şema

```mermaid
graph TD
    Client["🌐 Web Tarayıcısı (Yönetim Paneli)"]
    
    subgraph Frontend ["Ön Yüz (Glassmorphism & Vanilla CSS)"]
        Dashboard["Genel Bakış & Canlı Metrikler"]
        ConsoleUI["İnteraktif Canlı Konsol"]
        PlayitUI["Playit.gg Tünel Yöneticisi"]
        ModUI["Modrinth Mod Mağazası & Yöneticisi"]
        ConfigUI["Sunucu Ayarları & Renkli MOTD Editörü"]
        BackupUI["Dünya Yedekleme & Arşiv"]
    end

    subgraph Backend ["Node.js Backend & API Çekirdeği"]
        Express["Express HTTP Sunucusu (REST API)"]
        WSS["WebSocket Sunucusu (Canlı İletişim)"]
        MCProcess["Minecraft Süreç Yöneticisi"]
        PlayitProc["Playit Tünel Yöneticisi"]
        ModMgr["Modrinth API Entegratörü"]
        BackupMgr["Zip & Sıkıştırma Motoru"]
        ConfigMgr["Properties & Sistem Ayarları Motoru"]
        Installer["Forge / Vanilla Otomatik İndirici"]
    end

    subgraph External ["Harici Sistemler & Süreçler"]
        PlayitNet["☁️ Playit.gg Cloud Tünel Ağı"]
        ModrinthNet["📦 Modrinth Mod Deposu"]
        MojangNet["📥 Mojang / Forge Resmi Dağıtım Sunucuları"]
        MCServerJar["☕ Java Minecraft Sunucu Süreci (Child Process)"]
    end

    Client <-->|REST API / JSON| Express
    Client <-->|Çift Yönlü WebSocket| WSS

    Express --> MCProcess
    Express --> PlayitProc
    Express --> ModMgr
    Express --> BackupMgr
    Express --> ConfigMgr
    Express --> Installer

    WSS <-->|Canlı Log / RAM / CPU / Oyuncu Bilgisi| MCProcess
    WSS <-->|Tünel Durumu & Dinamik IP| PlayitProc

    MCProcess <-->|STDIN / STDOUT / pidusage| MCServerJar
    PlayitProc <-->|Yerel 25565 <-> Global Tünel IP| PlayitNet
    ModMgr <-->|Mod Arama & İndirme| ModrinthNet
    Installer <-->|Resmi Sürüm Kurulumu| MojangNet
```

---

## 🛠️ Kullanılan Teknolojiler & Kütüphaneler

| Bileşen | Teknoloji | Görevi ve Kullanım Amacı |
| :--- | :--- | :--- |
| **Backend Çekirdeği** | ![Node.js](https://img.shields.io/badge/-Node.js-339933?style=flat&logo=nodedotjs&logoColor=white) | Asenkron, yüksek hızlı backend çalışma ortamı |
| **Web Sunucusu** | ![Express.js](https://img.shields.io/badge/-Express.js-000000?style=flat&logo=express&logoColor=white) | RESTful API yönlendirmeleri ve statik dosya sunumu |
| **Canlı İletişim** | ![WebSocket](https://img.shields.io/badge/-WebSocket-010101?style=flat&logo=socketdotio&logoColor=white) | Gecikmesiz canlı konsol akışı, anlık CPU/RAM takibi |
| **Portsuz Tünelleme** | ![Playit.gg](https://img.shields.io/badge/-Playit.gg-blueviolet?style=flat) | Modem ayarı gerektirmeyen küresel bağlantı tüneli |
| **Mod Entegrasyonu** | ![Modrinth](https://img.shields.io/badge/-Modrinth%20API-00AF5C?style=flat&logo=modrinth&logoColor=white) | Tek tıkla Forge modlarını arama ve indirme motoru |
| **Performans İzleme**| `pidusage` | Sunucu sürecinin CPU ve RAM tüketimini anlık ölçme |
| **Java Çalışma Ortamı**| ![Java](https://img.shields.io/badge/-Java%20JRE-ED8B00?style=flat&logo=openjdk&logoColor=white) | Adoptium Hotspot / OpenJDK JVM çalıştırma altyapısı |
| **Oyun Altyapısı** | ![Minecraft Forge](https://img.shields.io/badge/-Minecraft%20Forge-DFA044?style=flat&logo=curseforge&logoColor=white) | Vanilla & Forge 1.7.10 - 1.21.x sunucu desteği |

---

## ✨ Öne Çıkan Özellikler

1. 🌐 **Modem Portu Açmaya Son (Playit.gg):**
   - Bilgisayarda kurulu sistem Playit servisini otomatik algılar veya bağımsız istemciyi indirir.
   - Tünel adresini (`*.ply.gg`, `*.joinmc.link`) loglardan otomatik çekip arayüze yansıtır.
2. ⚡ **Gelişmiş Canlı Konsol:**
   - Minecraft renk kodlarını ve log seviyelerini (INFO, WARN, ERROR) renklendirerek sunar.
   - Komut geçmişi ve arayüzden tek tıkla Minecraft komutu gönderme.
3. 🎨 **İnteraktif Renkli MOTD Editörü:**
   - 16 resmi renk butonu (`&0` - `&f`), kalın (`&l`), italik (`&o`), altı çizili (`&n`) ve hazır şablonlar.
   - Minecraft "Çok Oyunculu" sunucu listesi kartı formatında birebir canlı önizleme.
4. 🧩 **Tek Tıkla Mod Yönetimi:**
   - Modrinth pazarından mod arama, tek tıkla indirme, mod açma/kapatma.
5. 🛡️ **Akıllı Kurulum Motoru:**
   - Otomatik EULA onayı, düşük RAM'li sistemler için optimize Aikar JVM bayrakları ve güvenli çalıştırma.

---

## 🚀 Hızlı Kullanım Kılavuzu

### 1. Gereksinimler
- **[Node.js](https://nodejs.org/)** (v18.0.0 veya üzeri)
- **[Java JRE/JDK](https://adoptium.net/)** (Minecraft sürümünüze göre Java 17 veya 21)

### 2. Paneli Başlatma
**Windows için:** Klasördeki **`start_panel.bat`** dosyasına çift tıklayın.  
*(İlk açılışta paketleri kurar ve tarayıcınızda `http://localhost:3000` adresini açar).*

**Terminal üzerinden:**
```bash
npm install
npm start
```

### 3. Sunucuyu Kurup Başlatma
1. Sol menüden **"Sürüm & Kurulum"** sekmesine gidin, **Forge** veya **Vanilla** seçip **"Kurulumu Başlat"** deyin.
2. Kurulum bitince **"Genel Bakış"** sekmesine gelip yeşil **"Sunucuyu Başlat"** butonuna basın.
3. Arkadaşlarınızla oynamak için **"Playit.gg Tünel"** sekmesinden IP adresinizi kopyalayın!

---

## 👨‍💻 Yapımcı & Lisans
- **Yapımcı:** Sami Kahraman
- **Lisans:** [MIT Lisansı](LICENSE)
