<?php
namespace App\Services;

use App\Core\Database;
use Exception;
use PDO;

class ExportService
{
    private SchemaService $schemaService;

    public function __construct()
    {
        $this->schemaService = new SchemaService();
    }

    public function generateSqlDump(
        string $database,
        array $tables = [],
        bool $includeStructure = true,
        bool $includeData = true,
        bool $dropTable = true
    ): string {
        $pdo = Database::getPDO($database);
        
        if (empty($tables)) {
            $allTables = $this->schemaService->getTables($database);
            $tables = array_column($allTables, 'name');
        }

        $appName = "A-Core DB Studio";
        $version = "1.0.0";
        $date = date('Y-m-d H:i:s');

        $out = "-- ========================================================\n";
        $out .= "-- {$appName} SQL Dump\n";
        $out .= "-- Version: {$version}\n";
        $out .= "-- Generation Time: {$date}\n";
        $out .= "-- Host: " . ($_SESSION['db_connection']['host'] ?? '127.0.0.1') . "\n";
        $out .= "-- Database: `{$database}`\n";
        $out .= "-- ========================================================\n\n";

        $out .= "SET FOREIGN_KEY_CHECKS=0;\n";
        $out .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
        $out .= "SET time_zone = \"+00:00\";\n\n";

        foreach ($tables as $table) {
            $escapedTable = "`" . str_replace("`", "``", $table) . "`";

            if ($includeStructure) {
                $out .= "-- --------------------------------------------------------\n";
                $out .= "-- Table structure for table {$escapedTable}\n";
                $out .= "-- --------------------------------------------------------\n\n";

                if ($dropTable) {
                    $out .= "DROP TABLE IF EXISTS {$escapedTable};\n";
                }

                $createStmt = $pdo->query("SHOW CREATE TABLE {$escapedTable}")->fetch(PDO::FETCH_ASSOC);
                $createSql = $createStmt['Create Table'] ?? '';
                $out .= $createSql . ";\n\n";
            }

            if ($includeData) {
                $rows = $pdo->query("SELECT * FROM {$escapedTable}")->fetchAll(PDO::FETCH_ASSOC);
                if (!empty($rows)) {
                    $out .= "-- --------------------------------------------------------\n";
                    $out .= "-- Dumping data for table {$escapedTable}\n";
                    $out .= "-- --------------------------------------------------------\n\n";

                    $columns = array_keys($rows[0]);
                    $escapedCols = array_map(fn($c) => "`" . str_replace("`", "``", $c) . "`", $columns);
                    $colsHeader = implode(', ', $escapedCols);

                    $insertChunks = [];
                    foreach ($rows as $row) {
                        $values = [];
                        foreach ($row as $val) {
                            if ($val === null) {
                                $values[] = "NULL";
                            } elseif (is_numeric($val) && !is_string($val)) {
                                $values[] = $val;
                            } else {
                                $values[] = $pdo->quote((string)$val);
                            }
                        }
                        $insertChunks[] = "(" . implode(', ', $values) . ")";
                    }

                    // Chunk inserts by 100 rows to keep SQL statements manageable
                    $chunks = array_chunk($insertChunks, 100);
                    foreach ($chunks as $chunk) {
                        $out .= "INSERT INTO {$escapedTable} ({$colsHeader}) VALUES\n" . implode(",\n", $chunk) . ";\n\n";
                    }
                }
            }
        }

        $out .= "SET FOREIGN_KEY_CHECKS=1;\n";
        return $out;
    }

    public function generateCsv(string $database, string $table): string
    {
        $pdo = Database::getPDO($database);
        $escapedTable = "`" . str_replace("`", "``", $table) . "`";
        $stmt = $pdo->query("SELECT * FROM {$escapedTable}");
        
        $output = fopen('php://temp', 'r+');

        $headerWritten = false;
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            if (!$headerWritten) {
                fputcsv($output, array_keys($row));
                $headerWritten = true;
            }
            fputcsv($output, array_values($row));
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        return $csv ?: '';
    }

    public function generateJson(string $database, string $table): string
    {
        $pdo = Database::getPDO($database);
        $escapedTable = "`" . str_replace("`", "``", $table) . "`";
        $rows = $pdo->query("SELECT * FROM {$escapedTable}")->fetchAll(PDO::FETCH_ASSOC);
        
        return json_encode($rows, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }

    public function importSql(string $database, string $sqlContent): array
    {
        $pdo = Database::getPDO($database);

        // Remove comments and split into individual statements
        $queries = $this->splitSqlQueries($sqlContent);
        $executed = 0;
        $errors = [];

        foreach ($queries as $q) {
            $q = trim($q);
            if (empty($q)) continue;

            try {
                $pdo->exec($q);
                $executed++;
            } catch (Exception $e) {
                $errors[] = [
                    'query' => substr($q, 0, 200) . (strlen($q) > 200 ? '...' : ''),
                    'error' => $e->getMessage()
                ];
            }
        }

        return [
            'total_statements' => count($queries),
            'executed' => $executed,
            'errors' => $errors,
            'success' => empty($errors)
        ];
    }

    private function splitSqlQueries(string $sql): array
    {
        $queries = [];
        $currentQuery = '';
        $inString = false;
        $stringChar = '';
        $length = strlen($sql);

        for ($i = 0; $i < $length; $i++) {
            $char = $sql[$i];

            // Handle comments -- or #
            if (!$inString && ($char === '#' || ($char === '-' && ($sql[$i + 1] ?? '') === '-'))) {
                $endLine = strpos($sql, "\n", $i);
                if ($endLine === false) {
                    break;
                }
                $i = $endLine;
                continue;
            }

            // Handle /* */ comments
            if (!$inString && $char === '/' && ($sql[$i + 1] ?? '') === '*') {
                $endComment = strpos($sql, "*/", $i + 2);
                if ($endComment === false) {
                    break;
                }
                $i = $endComment + 1;
                continue;
            }

            // Handle string quotes
            if ($char === "'" || $char === '"' || $char === '`') {
                if ($inString && $char === $stringChar && ($sql[$i - 1] ?? '') !== '\\') {
                    $inString = false;
                } elseif (!$inString) {
                    $inString = true;
                    $stringChar = $char;
                }
            }

            // Check statement delimiter
            if ($char === ';' && !$inString) {
                $trimmed = trim($currentQuery);
                if (!empty($trimmed)) {
                    $queries[] = $trimmed;
                }
                $currentQuery = '';
            } else {
                $currentQuery .= $char;
            }
        }

        if (!empty(trim($currentQuery))) {
            $queries[] = trim($currentQuery);
        }

        return $queries;
    }
}
