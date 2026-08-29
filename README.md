# A-Core DB Studio - Modern Database Manager

ระบบจัดการฐานข้อมูล **MySQL / MariaDB** ยุคใหม่ (Modern phpMyAdmin Replacement) ออกแบบด้วย UI ระดับพรีเมียม สบายตา ไม่แสบตา โครงสร้างสถาปัตยกรรมระดับสากล แยก Frontend และ Backend ชัดเจน รองรับการติดตั้งและใช้งานได้ทั้งบน **Windows Server**, **Linux**, **macOS**, และ **Docker**

---

## 🌟 จุดเด่นและคุณสมบัติหลัก (Features)

- **🎨 Eye-Friendly Design**: โทนสี Soft Slate นุ่มนวล สบายตา ใช้งานได้ต่อเนื่องยาวนาน รองรับ **Light Mode / Dark Mode**
- **🎯 100% Pure Font Awesome Icons**: ปราศจาก Emoji ทุกไอคอนคมชัด เป็นมืออาชีพ
- **⚡ High Performance Single Page Application (SPA)**: สลับตาราง, รัน Query, แก้ไขข้อมูลได้ทันใจโดยไม่ต้องรีโหลดหน้าเว็บ
- **✏️ Interactive Inline Editing**: ดับเบิลคลิกช่องข้อมูลในตารางเพื่อแก้ไขและบันทึกได้ทันที
- **💻 Smart SQL Console**: มีระบบ Syntax Formatting, Snippets, ประวัติคำสั่ง (Query History), และคำสั่ง `EXPLAIN` วิเคราะห์ประสิทธิภาพ
- **🛠️ Full Schema & Table Manager**: จัดการคอลัมน์, ชนิดข้อมูล (Data Types), Primary Keys, Indexes, Foreign Keys
- **📦 Data Export & Import**: สำรองข้อมูลเป็น `.sql`, `.csv`, `.json` และนำเข้าไฟล์ SQL ด้วยระบบลากวาง
- **📊 Real-time Server Monitor**: ตรวจสอบ Uptime, ทราฟฟิก In/Out, Process List พร้อมสั่ง **Kill Query/Process** ได้ทันที

---

## 📋 ข้อกำหนดของระบบ (System Requirements)

- **PHP 8.0** ขึ้นไป (รองรับทั้ง Windows x64 NTS/TS และ Linux/macOS)
- **PHP Extensions**: `pdo`, `pdo_mysql`, `json`, `session`, `openssl`, `mbstring`
- **Database Server**: MySQL 5.7+, MySQL 8.0+, MariaDB 10.3+, หรือ Cloud MySQL (AWS RDS, GCP, Azure, DigitalOcean)
- **Web Browser**: Chrome, Safari, Firefox, Edge

---

## 🖥️ คู่มือการติดตั้งบน Windows Server (Windows Server Installation Guide)

สำหรับ **Windows Server (2016 / 2019 / 2022 / 2025)** คุณสามารถเลือกติดตั้งได้ 3 วิธีตามความเหมาะสมของสภาพแวดล้อม:

---

### วิธีที่ 1: ติดตั้งบน IIS (Internet Information Services) ⭐ มาตรฐาน Production แนะนำสำหรับองค์กร

วิธีนี้เป็นวิธีมาตรฐานสำหรับ Windows Server เพื่อให้รองรับทราฟฟิกสูงและปลอดภัยสูงสุด

#### ขั้นตอนที่ 1.1: ติดตั้ง IIS และโมดูล CGI
1. เปิด **Server Manager** บน Windows Server
2. คลิก **Add roles and features** -> เลือก Role-based -> เลือก Server
3. ในส่วน **Server Roles** ให้ติ๊กเลือก **Web Server (IIS)**
4. ในหัวข้อย่อย **Web Server > Application Development** ให้ติ๊กถูกที่:
   - ✅ **CGI** *(จำเป็นสำหรับการรัน PHP FastCGI)*
5. กด **Next** จนจบแล้วคลิก **Install**

#### ขั้นตอนที่ 1.2: ติดตั้ง PHP for Windows
1. ดาวน์โหลด PHP 8.x (แนะนำ **VS16 x64 Non Thread Safe**) จาก [windows.php.net/download](https://windows.php.net/download/)
2. แตกไฟล์ Zip ไปไว้ที่โฟลเดอร์ `C:\php`
3. คัดลอกไฟล์ `C:\php\php.ini-production` และเปลี่ยนชื่อเป็น `C:\php\php.ini`
4. เปิดไฟล์ `C:\php\php.ini` ด้วย Notepad หรือ Editor แล้วค้นหา/เปิดใช้งาน Extension เหล่านี้ (ลบเครื่องหมาย `;` ด้านหน้าออก):
   ```ini
   extension_dir = "ext"
   extension=curl
   extension=mbstring
   extension=openssl
   extension=pdo_mysql
   extension=mysqli
   cgi.force_redirect = 0
   cgi.fix_pathinfo = 1
   fastcgi.impersonate = 1
   date.timezone = "Asia/Bangkok"
   ```
5. ติดตั้ง **Visual C++ Redistributable (x64)** สำหรับ Visual Studio หากยังไม่ได้ติดตั้ง

#### ขั้นตอนที่ 1.3: ติดตั้ง IIS URL Rewrite Module
1. ดาวน์โหลดและติดตั้ง **IIS URL Rewrite Module 2.1** จาก [iis.net/downloads/microsoft/url-rewrite](https://www.iis.net/downloads/microsoft/url-rewrite)
2. Restart IIS 1 ครั้ง (เปิด CMD แบบ Admin แล้วพิมพ์ `iisreset`)

#### ขั้นตอนที่ 1.4: ตั้งค่า PHP Handler Mapping ใน IIS
1. เปิดโปรแกรม **IIS Manager** (`inetmgr`)
2. คลิกที่ชื่อ Server ที่แถบซ้าย -> ดับเบิลคลิกที่ **Handler Mappings**
3. คลิก **Add Module Mapping...** ที่แถบขวา แล้วกรอกข้อมูล:
   - **Request path**: `*.php`
   - **Module**: `FastCgiModule`
   - **Executable**: `C:\php\php-cgi.exe`
   - **Name**: `PHP_via_FastCGI`
4. กด **OK** แล้วตอบ **Yes** เพื่อยืนยัน

#### ขั้นตอนที่ 1.5: วางโฟลเดอร์ A-Core และสร้าง Site ใน IIS
1. คัดลอกโฟลเดอร์โปรเจกต์ `A-Core` ไปไว้ที่ `C:\inetpub\wwwroot\A-Core`
2. *(โปรเจกต์มีไฟล์ `web.config` สำหรับ IIS URL Rewrite มาให้ในตัวแล้ว)*
3. ใน **IIS Manager** ให้คลิกขวาที่ **Sites** -> **Add Website...** (หรือใช้ Default Web Site)
   - **Site name**: `A-Core DB Studio`
   - **Physical path**: `C:\inetpub\wwwroot\A-Core`
   - **Port**: `80` (หรือ Port อื่นที่ต้องการ เช่น `8080`)
4. ให้สิทธิ์การอ่านเขียนไฟล์ (Read & Execute) กับผู้ใช้ `IIS_IUSRS` บนโฟลเดอร์ `C:\inetpub\wwwroot\A-Core`
5. เปิดเบราว์เซอร์เข้าใช้งานผ่าน:
   ```text
   http://localhost/A-Core/  หรือ  http://<IP_WINDOWS_SERVER>/A-Core/
   ```

---

### วิธีที่ 2: รันเป็น Windows Background Service ด้วย NSSM (สะดวกรวดเร็ว ไม่ต้องลง IIS)

เหมาะสำหรับเครื่องทดสอบหรือ Server ที่ต้องการความเบา รวดเร็ว และให้ Service รันอัตโนมัติเมื่อเปิดเครื่อง:

1. แตกไฟล์ PHP ไปไว้ที่ `C:\php` (เปิดใช้งาน `extension=pdo_mysql` ใน `php.ini`)
2. วางโฟลเดอร์โปรเจกต์ไว้ที่ `C:\A-Core`
3. ดาวน์โหลดโปรแกรม **NSSM** (Non-Sucking Service Manager) จาก [nssm.cc](https://nssm.cc/)
4. เปิด **Command Prompt (Admin)** แล้วสั่ง:
   ```cmd
   nssm install ACoreDBStudio
   ```
5. ในหน้าต่าง NSSM GUI ให้ตั้งค่า:
   - **Path**: `C:\php\php.exe`
   - **Startup directory**: `C:\A-Core`
   - **Arguments**: `-S 0.0.0.0:8000 -t public`
6. คลิก **Install service** แล้วสั่งเริ่ม Service:
   ```cmd
   nssm start ACoreDBStudio
   ```
7. ระบบจะรันตลอดเวลาเป็น Service เบื้องหลัง เข้าใช้งานได้ที่ `http://<IP_WINDOWS_SERVER>:8000`

---

### วิธีที่ 3: ใช้งานผ่าน XAMPP for Windows

1. ติดตั้ง XAMPP for Windows จาก [apachefriends.org](https://www.apachefriends.org/)
2. วางโฟลเดอร์โปรเจกต์ไว้ที่ `C:\xampp\htdocs\A-Core`
3. เปิด **XAMPP Control Panel** แล้วกด **Start** ที่ **Apache** (และ **MySQL** หากต้องการใช้ DB ในตัว)
4. เข้าใช้งานได้ที่:
   ```text
   http://localhost/A-Core/
   ```

---

### 🔥 การตั้งค่า Windows Firewall สำหรับ Windows Server

เพื่อให้เครื่อง Client หรือเครื่องอื่นในเครือข่ายสามารถเข้าใช้งานเว็บและเชื่อมต่อ Database ได้:

เปิด **PowerShell (Admin)** แล้วรันคำสั่งเปิดพอร์ต Firewall:

```powershell
# เปิดพอร์ตสำหรับ Web (HTTP 80, 8000, 8080)
New-NetFirewallRule -DisplayName "A-Core Web Port" -Direction Inbound -LocalPort 80,8000,8080 -Protocol TCP -Action Allow

# เปิดพอร์ตสำหรับ MySQL (หาก MySQL อยู่บนเครื่องนี้และต้องการให้เชื่อมต่อจากภายนอก)
New-NetFirewallRule -DisplayName "MySQL Database Port" -Direction Inbound -LocalPort 3306 -Protocol TCP -Action Allow
```

---

## 💻 คู่มือสำหรับ macOS และ Linux

### 1. รันแบบ Standalone
```bash
cd /path/to/A-Core
./start.sh
```
*(หรือสั่งรัน: `php -S 127.0.0.1:8000 -t public`)*

### 2. รัน MySQL บน Docker
```bash
docker run --name my-mysql -e MYSQL_ROOT_PASSWORD=mypassword -p 3306:3306 -d mysql:8.0
```

---

## 📖 คู่มือการใช้งานระบบ (Feature & Usage Guide)

| ฟังก์ชัน | วิธีใช้งาน |
| :--- | :--- |
| **เลือกฐานข้อมูล (Database)** | เลือกฐานข้อมูลจากเมนูดรอปดาวน์ด้านบน หรือกดปุ่ม `+` เพื่อสร้าง Database ใหม่ |
| **ดูและแก้ไขข้อมูล (Inline Edit)** | คลิกเลือกตารางจากแถบด้านซ้าย -> **ดับเบิลคลิก** ช่องข้อมูลที่ต้องการแก้ -> พิมพ์ค่าใหม่ -> กด <kbd>Enter</kbd> เพื่อบันทึกทันที |
| **เพิ่มแถวใหม่ (Insert Row)** | กดปุ่ม <kbd>+ เพิ่มแถวใหม่ (Insert Row)</kbd> ด้านขวาบนของตาราง |
| **ค้นหาข้อมูลในตาราง** | พิมพ์คำค้นหาในช่องค้นหาด้านบน แล้วกด <kbd>Enter</kbd> |
| **จัดการโครงสร้างตาราง (Structure)** | คลิกที่แท็บ **"โครงสร้าง (Structure)"** เพื่อเพิ่มคอลัมน์ใหม่ (Add Column), แก้ไขชนิดข้อมูล, หรือลบ Index |
| **รันคำสั่ง SQL (SQL Console)** | คลิกแท็บ **"SQL Console"** -> พิมพ์คำสั่ง SQL -> กดปุ่มลัด <kbd>Ctrl</kbd> + <kbd>Enter</kbd> เพื่อรันคำสั่ง |
| **ส่งออก/นำเข้าข้อมูล (Export/Import)**| คลิกแท็บ **"Export / Import"** เพื่อดาวน์โหลดไฟล์ `.sql`, `.csv`, `.json` หรืออัปโหลดไฟล์ SQL เพื่อนำเข้า |
| **สลับโหมด Light/Dark** | กดปุ่ม **Light / Dark** ที่มุมบนขวาของหน้าจอ |

---

## 📁 โครงสร้างโปรเจกต์ (Directory Structure)

```text
A-Core/
├── index.php                         # Root Entrypoint
├── .htaccess                         # Root Apache rewrite configuration
├── web.config                        # Root IIS rewrite configuration for Windows Server
├── start.sh                          # Quick Start Script สำหรับ macOS / Linux
├── start.bat                         # Quick Start Script สำหรับ Windows
├── config/
│   ├── app.php                       # กำหนดค่าทั่วไป เวอร์ชัน และ Timezone
│   └── database.php                  # กำหนดค่าเริ่มต้นของระบบฐานข้อมูล
├── app/
│   ├── Core/
│   │   ├── Application.php           # Autoloader และ Application Bootstrapper
│   │   ├── Router.php                # RESTful Routing Engine
│   │   ├── Request.php               # HTTP Request Parser (GET, POST, JSON)
│   │   ├── Response.php              # JSON Response Builder & File Streamer
│   │   ├── Database.php              # Dynamic PDO Connection Manager
│   │   └── Session.php               # Connection & State Persistence
│   ├── Controllers/
│   │   ├── AuthController.php        # จัดการการเชื่อมต่อและโปรไฟล์
│   │   ├── DatabaseController.php    # จัดการ Database (List, Create, Drop)
│   │   ├── TableController.php       # จัดการข้อมูลตาราง (CRUD, Inline Edit, Sort, Search)
│   │   ├── StructureController.php   # จัดการโครงสร้างตาราง (Columns, Types, Indexes)
│   │   ├── QueryController.php       # ตัวรันคำสั่ง SQL, Explain, History
│   │   ├── ExportImportController.php# จัดการส่งออกและนำเข้าไฟล์ SQL/CSV/JSON
│   │   └── ServerController.php      # ตัวมอนิเตอร์ Server Status และ Process List
│   └── Services/
│       ├── SchemaService.php         # ดึง Metadata และสร้าง DDL
│       ├── QueryService.php          # ประมวลผล Raw SQL และจับเวลา Execution
│       └── ExportService.php         # ตัวสร้าง SQL Dump และ Parser
├── public/
│   ├── index.php                     # Public Front Controller
│   ├── .htaccess                     # Public Apache URL Rewrite Rules
│   ├── web.config                    # Public IIS URL Rewrite Rules
│   └── assets/
│       ├── css/
│       │   └── app.css               # สไตล์ชีต Eye-Friendly Dark/Light Mode
│       └── js/
│           ├── app.js                # App Bootstrapper
│           ├── api.js                # Fetch API Client & Loading Bar
│           ├── store.js              # Reactive State Store
│           ├── utils/
│           │   ├── toast.js          # Toast Notification System
│           │   └── formatter.js      # ตัวแปลง Format ข้อมูล, ขนาดไฟล์, วันที่
│           └── components/
│               ├── Header.js         # Top Bar & Theme Switcher
│               ├── Sidebar.js        # Database & Table Explorer
│               ├── DataGrid.js       # Interactive Data Table & Inline Editor
│               ├── SchemaViewer.js   # Column & Index Structure Manager
│               ├── SqlEditor.js      # SQL Console & Query Runner
│               ├── ExportImport.js   # Export/Import Wizard
│               ├── ServerMonitor.js  # Live Metrics & Process List
│               └── Modal.js          # Reusable Dialog System
└── views/
    └── app.php                       # Single Page Application Main HTML Layout
```

---

## 🔒 ความปลอดภัย (Security & Best Practices)

- การเชื่อมต่อทั้งหมดใช้ **PDO (PHP Data Objects)** พร้อม Prepared Statements ป้องกัน SQL Injection
- Credentials ถูกจัดเก็บใน PHP Session ในฝั่ง Server เท่านั้น ไม่มีการบันทึก Plain Password บน Disk
- ระบบจำกัดขอบเขตการทำงานเฉพาะภายในโฟลเดอร์โปรเจกต์ `A-Core` เท่านั้น
