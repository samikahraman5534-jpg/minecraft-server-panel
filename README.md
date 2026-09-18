# 🌸 Sakura Minecraft Server & Web Management Panel

Modern, şık ve güçlü bir web tabanlı Minecraft Forge & Vanilla sunucu yönetim paneli. Port açmaya gerek kalmadan tüm dünyayla oynamanızı sağlayan **Playit.gg tünelleme** entegrasyonu, **Modrinth mod pazarı** ve **dünya yedekleme** sistemi ile birlikte gelir.

> **Geliştirici / Yapımcı:** Sami Kahraman  
> **Lisans:** MIT  
> **Sürüm:** v1.1.0  

---

## ✨ Özellikler

- 🖥️ **Modern Sakura Arayüzü:** Koyu tema, akıcı animasyonlar, sakura yaprağı efektleri ve glassmorphism tasarım.
- 🌐 **Playit.gg Entegre Tünelleme:** Port yönlendirme (Port Forwarding) yapmadan sunucunuzu anında internete açın, tek tıkla IP kopyalayın.
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
