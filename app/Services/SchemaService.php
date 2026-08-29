<?php
namespace App\Services;

use App\Core\Database;
use Exception;
use PDO;

class SchemaService
{
    public function getDatabases(): array
    {
        $sql = "SELECT 
                    s.SCHEMA_NAME AS name,
                    s.DEFAULT_CHARACTER_SET_NAME AS charset,
                    s.DEFAULT_COLLATION_NAME AS collation,
                    COUNT(t.TABLE_NAME) AS table_count,
                    COALESCE(SUM(t.DATA_LENGTH + t.INDEX_LENGTH), 0) AS total_size
                FROM information_schema.SCHEMATA s
                LEFT JOIN information_schema.TABLES t ON s.SCHEMA_NAME = t.TABLE_SCHEMA
                WHERE s.SCHEMA_NAME NOT IN ('information_schema', 'performance_schema', 'sys', 'mysql')
                GROUP BY s.SCHEMA_NAME, s.DEFAULT_CHARACTER_SET_NAME, s.DEFAULT_COLLATION_NAME
                ORDER BY s.SCHEMA_NAME ASC";

        return Database::fetchAll($sql);
    }

    public function getAllDatabasesWithSystem(): array
    {
        $sql = "SELECT 
                    s.SCHEMA_NAME AS name,
                    s.DEFAULT_CHARACTER_SET_NAME AS charset,
                    s.DEFAULT_COLLATION_NAME AS collation,
                    COUNT(t.TABLE_NAME) AS table_count,
                    COALESCE(SUM(t.DATA_LENGTH + t.INDEX_LENGTH), 0) AS total_size,
                    CASE WHEN s.SCHEMA_NAME IN ('information_schema', 'performance_schema', 'sys', 'mysql') THEN 1 ELSE 0 END AS is_system
                FROM information_schema.SCHEMATA s
                LEFT JOIN information_schema.TABLES t ON s.SCHEMA_NAME = t.TABLE_SCHEMA
                GROUP BY s.SCHEMA_NAME, s.DEFAULT_CHARACTER_SET_NAME, s.DEFAULT_COLLATION_NAME
                ORDER BY is_system ASC, s.SCHEMA_NAME ASC";

        return Database::fetchAll($sql);
    }

    public function getTables(string $database): array
    {
        $sql = "SELECT 
                    TABLE_NAME AS name,
                    TABLE_TYPE AS type,
                    ENGINE AS engine,
                    TABLE_ROWS AS `rows`,
                    DATA_LENGTH AS data_length,
                    INDEX_LENGTH AS index_length,
                    (DATA_LENGTH + INDEX_LENGTH) AS total_size,
                    AUTO_INCREMENT AS auto_increment,
                    TABLE_COLLATION AS collation,
                    TABLE_COMMENT AS comment,
                    CREATE_TIME AS create_time,
                    UPDATE_TIME AS update_time
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = :database
                ORDER BY TABLE_NAME ASC";

        return Database::fetchAll($sql, ['database' => $database]);
    }

    public function getTableColumns(string $database, string $table): array
    {
        $sql = "SELECT 
                    COLUMN_NAME AS name,
                    ORDINAL_POSITION AS position,
                    COLUMN_DEFAULT AS default_value,
                    IS_NULLABLE AS is_nullable,
                    DATA_TYPE AS data_type,
                    COLUMN_TYPE AS column_type,
                    COLUMN_KEY AS column_key,
                    EXTRA AS extra,
                    COLLATION_NAME AS collation,
                    COLUMN_COMMENT AS comment
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = :database AND TABLE_NAME = :table
                ORDER BY ORDINAL_POSITION ASC";

        return Database::fetchAll($sql, ['database' => $database, 'table' => $table]);
    }

    public function getTableIndexes(string $database, string $table): array
    {
        $sql = "SHOW INDEX FROM `" . str_replace("`", "``", $database) . "`.`" . str_replace("`", "``", $table) . "`";
        $raw = Database::fetchAll($sql);

        $indexes = [];
        foreach ($raw as $row) {
            $keyName = $row['Key_name'];
            if (!isset($indexes[$keyName])) {
                $indexes[$keyName] = [
                    'name' => $keyName,
                    'unique' => $row['Non_unique'] == 0,
                    'primary' => $keyName === 'PRIMARY',
                    'type' => $row['Index_type'],
                    'columns' => [],
                    'comment' => $row['Comment'] ?? '',
                ];
            }
            $indexes[$keyName]['columns'][] = [
                'name' => $row['Column_name'],
                'seq' => $row['Seq_in_index'],
                'cardinality' => $row['Cardinality'] ?? null,
                'sub_part' => $row['Sub_part'] ?? null,
            ];
        }

        return array_values($indexes);
    }

    public function getTableForeignKeys(string $database, string $table): array
    {
        $sql = "SELECT 
                    CONSTRAINT_NAME AS constraint_name,
                    COLUMN_NAME AS column_name,
                    REFERENCED_TABLE_SCHEMA AS referenced_schema,
                    REFERENCED_TABLE_NAME AS referenced_table,
                    REFERENCED_COLUMN_NAME AS referenced_column
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = :database 
                  AND TABLE_NAME = :table
                  AND REFERENCED_TABLE_NAME IS NOT NULL";

        return Database::fetchAll($sql, ['database' => $database, 'table' => $table]);
    }

    public function getCollations(): array
    {
        $sql = "SHOW COLLATION";
        return Database::fetchAll($sql);
    }

    public function getEngines(): array
    {
        $sql = "SHOW ENGINES";
        return Database::fetchAll($sql);
    }

    public function createDatabase(string $name, string $charset = 'utf8mb4', string $collation = 'utf8mb4_unicode_ci'): bool
    {
        $escapedName = str_replace("`", "``", $name);
        $sql = "CREATE DATABASE `{$escapedName}` CHARACTER SET `{$charset}` COLLATE `{$collation}`";
        Database::execute($sql);
        return true;
    }

    public function dropDatabase(string $name): bool
    {
        $escapedName = str_replace("`", "``", $name);
        $sql = "DROP DATABASE `{$escapedName}`";
        Database::execute($sql);
        return true;
    }

    public function createTable(string $database, string $table, array $columns, string $engine = 'InnoDB', string $collation = 'utf8mb4_unicode_ci'): bool
    {
        if (empty($columns)) {
            throw new Exception("ต้องกำหนดอย่างน้อย 1 คอลัมน์");
        }

        $colDefs = [];
        $primaryKeys = [];

        foreach ($columns as $col) {
            $name = trim($col['name']);
            $type = trim($col['type']);
            if (empty($name) || empty($type)) continue;

            $def = "`" . str_replace("`", "``", $name) . "` " . $type;
            
            if (!empty($col['nullable']) && $col['nullable'] === true) {
                $def .= " NULL";
            } else {
                $def .= " NOT NULL";
            }

            if (isset($col['default']) && $col['default'] !== '') {
                if (strtoupper($col['default']) === 'CURRENT_TIMESTAMP' || strtoupper($col['default']) === 'NULL') {
                    $def .= " DEFAULT " . $col['default'];
                } else {
                    $def .= " DEFAULT '" . addslashes($col['default']) . "'";
                }
            }

            if (!empty($col['auto_increment'])) {
                $def .= " AUTO_INCREMENT";
            }

            if (!empty($col['comment'])) {
                $def .= " COMMENT '" . addslashes($col['comment']) . "'";
            }

            if (!empty($col['primary'])) {
                $primaryKeys[] = "`" . str_replace("`", "``", $name) . "`";
            }

            $colDefs[] = $def;
        }

        if (!empty($primaryKeys)) {
            $colDefs[] = "PRIMARY KEY (" . implode(', ', $primaryKeys) . ")";
        }

        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        $charset = explode('_', $collation)[0] ?? 'utf8mb4';

        $sql = "CREATE TABLE `{$escapedDb}`.`{$escapedTable}` (\n  " . implode(",\n  ", $colDefs) . "\n) ENGINE={$engine} DEFAULT CHARSET={$charset} COLLATE={$collation}";

        Database::execute($sql);
        return true;
    }

    public function dropTable(string $database, string $table): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        Database::execute("DROP TABLE `{$escapedDb}`.`{$escapedTable}`");
        return true;
    }

    public function truncateTable(string $database, string $table): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        Database::execute("TRUNCATE TABLE `{$escapedDb}`.`{$escapedTable}`");
        return true;
    }

    public function renameTable(string $database, string $oldName, string $newName): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedOld = str_replace("`", "``", $oldName);
        $escapedNew = str_replace("`", "``", $newName);
        Database::execute("RENAME TABLE `{$escapedDb}`.`{$escapedOld}` TO `{$escapedDb}`.`{$escapedNew}`");
        return true;
    }

    public function addColumn(string $database, string $table, array $column, ?string $after = null): bool
    {
        $name = trim($column['name']);
        $type = trim($column['type']);
        $nullable = !empty($column['nullable']) ? "NULL" : "NOT NULL";
        $default = "";
        if (isset($column['default']) && $column['default'] !== '') {
            if (in_array(strtoupper($column['default']), ['CURRENT_TIMESTAMP', 'NULL'])) {
                $default = " DEFAULT " . $column['default'];
            } else {
                $default = " DEFAULT '" . addslashes($column['default']) . "'";
            }
        }
        $extra = !empty($column['auto_increment']) ? " AUTO_INCREMENT" : "";
        $comment = !empty($column['comment']) ? " COMMENT '" . addslashes($column['comment']) . "'" : "";
        
        $position = "";
        if ($after === 'FIRST') {
            $position = " FIRST";
        } elseif ($after) {
            $position = " AFTER `" . str_replace("`", "``", $after) . "`";
        }

        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        $escapedCol = str_replace("`", "``", $name);

        $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` ADD COLUMN `{$escapedCol}` {$type} {$nullable}{$default}{$extra}{$comment}{$position}";
        Database::execute($sql);
        return true;
    }

    public function modifyColumn(string $database, string $table, string $oldColName, array $column): bool
    {
        $name = trim($column['name']);
        $type = trim($column['type']);
        $nullable = !empty($column['nullable']) ? "NULL" : "NOT NULL";
        $default = "";
        if (isset($column['default']) && $column['default'] !== '') {
            if (in_array(strtoupper($column['default']), ['CURRENT_TIMESTAMP', 'NULL'])) {
                $default = " DEFAULT " . $column['default'];
            } else {
                $default = " DEFAULT '" . addslashes($column['default']) . "'";
            }
        }
        $extra = !empty($column['auto_increment']) ? " AUTO_INCREMENT" : "";
        $comment = !empty($column['comment']) ? " COMMENT '" . addslashes($column['comment']) . "'" : "";

        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        $escapedOld = str_replace("`", "``", $oldColName);
        $escapedNew = str_replace("`", "``", $name);

        $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` CHANGE COLUMN `{$escapedOld}` `{$escapedNew}` {$type} {$nullable}{$default}{$extra}{$comment}";
        Database::execute($sql);
        return true;
    }

    public function dropColumn(string $database, string $table, string $column): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        $escapedCol = str_replace("`", "``", $column);

        $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` DROP COLUMN `{$escapedCol}`";
        Database::execute($sql);
        return true;
    }

    public function addIndex(string $database, string $table, string $name, string $type, array $columns): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);
        $escapedCols = array_map(fn($c) => "`" . str_replace("`", "``", trim($c)) . "`", $columns);
        $colsList = implode(', ', $escapedCols);

        if (strtoupper($type) === 'PRIMARY') {
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` ADD PRIMARY KEY ({$colsList})";
        } elseif (strtoupper($type) === 'UNIQUE') {
            $escapedName = str_replace("`", "``", $name);
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` ADD UNIQUE `{$escapedName}` ({$colsList})";
        } elseif (strtoupper($type) === 'FULLTEXT') {
            $escapedName = str_replace("`", "``", $name);
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` ADD FULLTEXT `{$escapedName}` ({$colsList})";
        } else {
            $escapedName = str_replace("`", "``", $name);
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` ADD INDEX `{$escapedName}` ({$colsList})";
        }

        Database::execute($sql);
        return true;
    }

    public function dropIndex(string $database, string $table, string $name): bool
    {
        $escapedDb = str_replace("`", "``", $database);
        $escapedTable = str_replace("`", "``", $table);

        if ($name === 'PRIMARY') {
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` DROP PRIMARY KEY";
        } else {
            $escapedName = str_replace("`", "``", $name);
            $sql = "ALTER TABLE `{$escapedDb}`.`{$escapedTable}` DROP INDEX `{$escapedName}`";
        }

        Database::execute($sql);
        return true;
    }
}
