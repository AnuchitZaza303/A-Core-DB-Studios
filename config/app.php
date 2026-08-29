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
    'admin_password' => 'admin1234', // สามารถเปลี่ยนเป็นรหัสผ่านที่คุณต้องการได้เลย

    'default_host' => '127.0.0.1',
    'default_port' => 3306,
    'default_user' => 'root',
    'max_export_rows' => 50000,
    'max_import_size' => 100 * 1024 * 1024, // 100MB
];
