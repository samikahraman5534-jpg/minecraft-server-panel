# 🌸 Sakura Minecraft Server & Web Panel

<p align="center">
  <a href="#english"><strong>English</strong></a> •
  <a href="#türkçe"><strong>Türkçe</strong></a>
</p>

---

<a name="english"></a>
# 🇬🇧 User Guide (How to Use)

Welcome to **Sakura Minecraft Server & Web Management Panel**! This guide will walk you through how to set up, run, and manage your Minecraft server in a few simple steps.

> **Developer / Author:** Sami Kahraman  
> **License:** MIT  

---

### 1. Requirements Before You Start
Make sure you have installed on your computer:
1. **[Node.js](https://nodejs.org/)** (v18 or newer recommended)
2. **[Java (JRE/JDK)](https://adoptium.net/)** (Java 17 or 21 depending on your Minecraft version)

---

### 2. Quick Setup & Starting the Panel

1. **Download or Clone the project** to your computer.
2. **Double-click `start_panel.bat`** (Windows users):
   - On the first run, it will automatically install necessary packages.
   - It will launch the Web Panel at **http://localhost:3000** in your browser.
3. *(Alternative for Linux/Mac/Terminal):*
   ```bash
   npm install
   npm start
   ```

---

### 3. Step-by-Step Usage Guide

#### 📥 Step 1: Install Your Server Core
- Navigate to the **"Version & Installer"** tab from the left sidebar.
- Choose your desired server type (**Vanilla** or **Forge**) and version (e.g. `1.20.1`).
- Click **"Install / Download"**. The panel will automatically download the server files and accept the Minecraft EULA for you.

#### ▶️ Step 2: Start the Server & Live Console
- Go to the **"Dashboard"** (Overview) tab.
- Click the green **"Start Server"** button.
- Switch to the **"Live Console"** tab to monitor the boot sequence and player chat in real time. You can send commands (e.g. `gamemode creative`, `op <player>`) directly from the input box below.

#### 🌐 Step 3: Play with Friends (No Port Forwarding Required)
- Open the **"Playit.gg Tunnel"** tab.
- If it's your first time, click **"Download Playit"** and then **"Start Tunnel"**.
- Click the **Claim Link** if prompted to link to your free Playit.gg account.
- Copy your generated Public IP address and share it with your friends!

#### 🧩 Step 4: Add & Manage Mods (For Forge)
- Go to the **"Mod Manager"** tab.
- Search for any mod through the built-in **Modrinth search bar** and install it with a single click.
- Easily enable, disable, or delete mods from your mod list.

#### 🌍 Step 5: Worlds & Backups
- Go to the **"World Backups"** tab.
- Click **"Create Backup Now"** to compress your entire world into a `.zip` archive before making major changes.
- You can download backups to your computer or restore them at any time.

---

### 👨‍💻 Developer
- **Sami Kahraman**

### 📄 License
This project is licensed under the [MIT License](LICENSE).

---
---

<a name="türkçe"></a>
# 🇹🇷 Kullanım Kılavuzu (Nasıl Kullanılır?)

**Sakura Minecraft Sunucu & Web Yönetim Paneli**'ne hoş geldiniz! Bu kılavuz, sunucunuzu hiçbir teknik bilgiye ihtiyaç duymadan birkaç adımda nasıl kurup arkadaşlarınızla oynayabileceğinizi anlatır.

> **Geliştirici / Yapımcı:** Sami Kahraman  
> **Lisans:** MIT  

---

### 1. Başlamadan Önce Gerekenler
Bilgisayarınızda şunların kurulu olduğundan emin olun:
1. **[Node.js](https://nodejs.org/)** (v18 veya üzeri önerilir)
2. **[Java (JRE/JDK)](https://adoptium.net/)** (Oynamak istediğiniz Minecraft sürümüne uygun Java 17 veya 21)

---

### 2. Hızlı Kurulum ve Paneli Başlatma

1. Projeyi bilgisayarınıza indirin.
2. Klasör içindeki **`start_panel.bat`** dosyasına çift tıklayın:
   - İlk açılışta gerekli kütüphaneleri otomatik olarak yükler.
   - Ardından web tarayıcınızda **http://localhost:3000** adresini otomatik olarak açar.
3. *(Terminal / Konsol üzerinden çalıştırmak isterseniz):*
   ```bash
   npm install
   npm start
   ```

---

### 3. Adım Adım Kullanım Rehberi

#### 📥 Adım 1: Sunucuyu Kurma (Sürüm Seçimi)
- Sol menüden **"Sürüm & Kurulum"** sekmesine tıklayın.
- Oynamak istediğiniz sunucu türünü (**Vanilla** veya **Forge**) ve sürümünü (örneğin `1.20.1`) seçin.
- **"Kurulumu Başlat"** butonuna basın. Panel gerekli dosyaları indirip Minecraft EULA sözleşmesini otomatik olarak onaylar.

#### ▶️ Adım 2: Sunucuyu Başlatma ve Canlı Konsol
- Sol menüden **"Genel Bakış"** sekmesine gelin.
- Yeşil renkli **"Sunucuyu Başlat"** butonuna tıklayın.
- **"Canlı Konsol"** sekmesine geçerek sunucunun açılışını anlık olarak izleyebilir, alt kısımdaki komut satırından komut gönderebilirsiniz (örneğin: `op OyuncuAdi`, `gamemode creative`).

#### 🌐 Adım 3: Arkadaşlarınızla Oynama (Port Açmaya Gerek Yok)
- Sol menüden **"Playit.gg Tünel"** sekmesine geçin.
- Eğer henüz inmemişse **"Playit İndir"** ve ardından **"Tüneli Başlat"** butonuna tıklayın.
- Ekrana gelen **Hesap Eşleme (Claim)** bağlantısına tıklayarak ücretsiz playit hesabınızı bağlayın.
- Verilen tünel adresini (IP) kopyalayın ve arkadaşlarınıza verin. Artık herkes sunucunuza katılabilir!

#### 🧩 Adım 4: Mod Yükleme ve Yönetme (Forge İçin)
- **"Mod Yöneticisi"** sekmesine gidin.
- Dahili **Modrinth arama kutusuna** istediğiniz modun adını yazın ve tek tıkla indirin.
- Yüklü modları arayüzden tek tıkla açıp kapatabilir veya silebilirsiniz.

#### 🌍 Adım 5: Yedek Alma ve Dünyayı Koruma
- **"Dünya Yedekleri"** sekmesine gidin.
- **"Şimdi Yedek Oluştur"** butonuna basarak dünyanızı anında `.zip` formatında yedekleyin.
- Dilediğiniz zaman eski bir yedeğe tek tıkla geri dönebilir veya yedeği bilgisayarınıza indirebilirsiniz.

---

### 👨‍💻 Yapımcı
- **Sami Kahraman**

### 📄 Lisans
Bu proje [MIT Lisansı](LICENSE) altında lisanslanmıştır.
