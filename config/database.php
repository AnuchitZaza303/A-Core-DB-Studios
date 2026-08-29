<?php
/**
 * A-Core Database Studio
 * Database Connection Default Options & Drivers
 */

return [
    'driver' => 'mysql',
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'options' => [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
    ],
    'supported_collations' => [
        'utf8mb4_unicode_ci',
        'utf8mb4_general_ci',
        'utf8mb4_0900_ai_ci',
        'utf8_general_ci',
        'utf8_unicode_ci',
        'latin1_swedish_ci',
    ],
    'supported_engines' => [
        'InnoDB',
        'MyISAM',
        'MEMORY',
        'CSV',
    ],
];
