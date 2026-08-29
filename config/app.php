<?php
/**
 * A-Core Database Studio
 * Application Configuration
 */

return [
    'name' => 'A-Core DB Studio',
    'version' => '1.0.0',
    'locale' => 'th',
    'timezone' => 'Asia/Bangkok',
    'session_name' => 'acore_db_studio_session',
    'session_lifetime' => 86400 * 7, // 7 days

    // Application Master Security Gate (ระบบล็อกหน้าเว็บด้วยรหัสผ่านก่อนเข้าใช้งาน)
    'auth_required' => true,
    'admin_username' => 'admin',
    'admin_password' => 'gr@eqVG66H&', // รหัสผ่านสำหรับเข้าใช้งานระบบ A-Core

    // Auto-Connect Database (เชื่อมต่อฐานข้อมูลอัตโนมัติทันทีที่ล็อกอินผ่าน Security Gate)
    'auto_connect_db' => true,
    'default_host' => '127.0.0.1',
    'default_port' => 3306,
    'default_user' => 'root',
    'default_password' => '', // รหัสผ่าน MySQL ของเซิร์ฟเวอร์ (ใส่ถ้า MySQL มีการตั้งรหัสผ่านไว้)
    
    'max_export_rows' => 50000,
    'max_import_size' => 100 * 1024 * 1024, // 100MB
];
