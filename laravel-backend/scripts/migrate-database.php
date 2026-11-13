<?php

declare(strict_types=1);

// Does not bootstrap Laravel, read its normal .env, or touch its config cache.
require dirname(__DIR__).'/vendor/autoload.php';

use App\Migration\PostgresSchema as Pg;
use Dotenv\Dotenv;

function migrationSchema(): string
{
    return defined('BYAHERO_PRODUCTION_IMPORT') && BYAHERO_PRODUCTION_IMPORT === true
        ? 'byahero_production' : 'byahero_test';
}

function migrationBucket(): string
{
    return migrationSchema() === 'byahero_production' ? 'byahero-uploads' : 'byahero-test-uploads';
}
const PROJECT_REF = 'dvkpbydrrpurlbjsjlux';

function settings(string $name): array
{
    if ($name === 'supabase' && migrationSchema() === 'byahero_production') $name = 'supabase.production';
    $file = dirname(__DIR__).'/.env.'.$name;
    if (!is_file($file)) throw new RuntimeException('Missing '.$file.'; copy the matching .example file.');
    return Dotenv::parse(file_get_contents($file));
}

function required(array $env, string $key): string
{
    if (!isset($env[$key]) || trim($env[$key]) === '') throw new RuntimeException('Fill '.$key.' in the ignored environment file.');
    return $env[$key];
}

function source(): PDO
{
    $env = settings('migration');
    $host = required($env, 'SOURCE_DB_HOST');
    if (!preg_match('/^[a-z0-9.-]+\.alwaysdata\.net$/i', $host)) {
        throw new RuntimeException('The source must be the current alwaysdata MySQL host.');
    }
    $options = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC];
    if (!empty($env['SOURCE_DB_SSL_CA'])) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $env['SOURCE_DB_SSL_CA'];
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = true;
    }
    $db = new PDO('mysql:host='.$host.';port='.($env['SOURCE_DB_PORT'] ?? '3306')
        .';dbname='.required($env, 'SOURCE_DB_DATABASE').';charset=utf8mb4',
        required($env, 'SOURCE_DB_USERNAME'), required($env, 'SOURCE_DB_PASSWORD'), $options);
    $db->exec("SET time_zone = '+08:00'");
    return $db;
}

function target(): PDO
{
    $env = settings('supabase');
    if (migrationSchema() === 'byahero_production' && ($env['DEPLOYMENT_ROLE'] ?? '') !== 'production') throw new RuntimeException('Production import requires DEPLOYMENT_ROLE=production.');
    if (($env['DB_CONNECTION'] ?? '') !== 'pgsql' || ($env['DB_SCHEMA'] ?? '') !== migrationSchema() || !empty($env['DB_URL'])) {
        throw new RuntimeException('Target must be pgsql, DB_SCHEMA='.migrationSchema().', with no DB_URL override.');
    }
    $host = required($env, 'DB_HOST');
    $user = required($env, 'DB_USERNAME');
    $isDirect = $host === 'db.'.PROJECT_REF.'.supabase.co';
    $isPooler = preg_match('/^[a-z0-9.-]+\.pooler\.supabase\.com$/', $host) && $user === 'postgres.'.PROJECT_REF;
    if (!$isDirect && !$isPooler) throw new RuntimeException('Target connection does not match the designated Supabase test project.');
    if (($env['DB_PORT'] ?? '5432') !== '5432') throw new RuntimeException('Use the Session pooler on port 5432 for migration, not the Transaction pooler.');
    $db = new PDO('pgsql:host='.$host.';port=5432;dbname=postgres;sslmode=require;connect_timeout=15',
        $user, required($env, 'DB_PASSWORD'), [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
    $db->exec("SET TIME ZONE 'Asia/Manila'");
    $db->exec('SET search_path TO '.Pg::quote(migrationSchema()));
    return $db;
}

function query(PDO $db, string $sql, array $params = []): array
{
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function snapshotPath(string $name): string
{
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) throw new RuntimeException('Snapshot name must contain only letters, digits, underscores, or hyphens.');
    return dirname(__DIR__).'/storage/migration/'.$name;
}

function metadata(PDO $db): array
{
    $schema = $db->query('SELECT DATABASE()')->fetchColumn();
    foreach (['TRIGGERS' => 'TRIGGER_SCHEMA', 'ROUTINES' => 'ROUTINE_SCHEMA', 'EVENTS' => 'EVENT_SCHEMA'] as $table => $column) {
        $found = query($db, "SELECT COUNT(*) AS n FROM information_schema.$table WHERE $column = ?", [$schema]);
        if ((int) $found[0]['n'] > 0) throw new RuntimeException('Source contains '.$table.'; convert them explicitly before exporting.');
    }
    $tables = query($db, 'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, DATA_LENGTH, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME', [$schema]);
    $result = [];
    foreach ($tables as $table) {
        $name = $table['TABLE_NAME'];
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $name)) throw new RuntimeException('Review unusual table name.');
        if ($table['TABLE_TYPE'] !== 'BASE TABLE' || !in_array(strtoupper($table['ENGINE'] ?? ''), ['INNODB', 'MYISAM'], true)) {
            throw new RuntimeException('Unsupported storage engine or view; review '.$name);
        }
        $columns = query($db, 'SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_MAXIMUM_LENGTH, NUMERIC_PRECISION, NUMERIC_SCALE, GENERATION_EXPRESSION FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION', [$schema, $name]);
        foreach ($columns as $column) Pg::column($column); // Fail before copying if conversion is unsupported.
        $indexes = query($db, 'SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX', [$schema, $name]);
        foreach ($indexes as $index) {
            if ($index['SUB_PART'] !== null || $index['COLUMN_NAME'] === null || $index['INDEX_TYPE'] !== 'BTREE') {
                throw new RuntimeException('Index needs explicit conversion: '.$name.'.'.$index['INDEX_NAME']);
            }
        }
        $foreignKeys = query($db, 'SELECT k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.UPDATE_RULE, r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.TABLE_SCHEMA=? AND k.TABLE_NAME=? AND k.REFERENCED_TABLE_NAME IS NOT NULL ORDER BY k.CONSTRAINT_NAME, k.ORDINAL_POSITION', [$schema, $name]);
        $result[$name] = ['columns' => $columns, 'indexes' => $indexes, 'foreign_keys' => $foreignKeys,
            'source_engine' => $table['ENGINE'],
            'estimated_bytes' => (int) $table['DATA_LENGTH'] + (int) $table['INDEX_LENGTH']];
    }
    return $result;
}

function sourceDigest(PDO $db, string $table, array $columns): string
{
    $digest = str_repeat("\0", 32);
    $stmt = $db->query('SELECT * FROM `'.$table.'`');
    while ($row = $stmt->fetch()) {
        foreach ($columns as $column) {
            $key = $column['COLUMN_NAME'];
            if ($row[$key] !== null && Pg::binary($column)) $row[$key] = base64_encode($row[$key]);
        }
        $digest ^= Pg::digest($row, $columns);
    }
    return bin2hex($digest);
}

function exportSnapshot(string $name): void
{
    $db = source();
    $tables = metadata($db);
    if (array_sum(array_column($tables, 'estimated_bytes')) > 350 * 1024 * 1024) {
        throw new RuntimeException('Source is too close to the 500 MB Free database limit; choose a reviewed retention/export policy first.');
    }
    $dir = snapshotPath($name);
    if (file_exists($dir)) throw new RuntimeException('Snapshot already exists; use a new name.');
    mkdir($dir, 0700, true);
    $skip = array_filter(explode(',', settings('migration')['MIGRATION_SKIP_DATA'] ?? ''));
    $nonTransactional = [];
    foreach ($tables as $table => $info) {
        if (strtoupper($info['source_engine']) === 'MYISAM' && !in_array($table, $skip, true)) {
            $nonTransactional[$table] = sourceDigest($db, $table, $info['columns']);
        }
    }
    $db->exec('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    $db->exec('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
    try {
        foreach ($tables as $table => &$info) {
            $info['rows'] = 0;
            $digest = str_repeat("\0", 32);
            $file = fopen($dir.'/'.$table.'.jsonl', 'xb');
            try {
                if (!in_array($table, $skip, true)) {
                    $stmt = $db->query('SELECT * FROM `'.$table.'`');
                    while ($row = $stmt->fetch()) {
                        foreach ($info['columns'] as $column) {
                            $key = $column['COLUMN_NAME'];
                            if ($row[$key] !== null && Pg::binary($column)) $row[$key] = base64_encode($row[$key]);
                        }
                        fwrite($file, json_encode($row, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)."\n");
                        $digest ^= Pg::digest($row, $info['columns']);
                        $info['rows']++;
                    }
                }
            } finally {
                fclose($file);
            }
            $info['data_sha256'] = hash_file('sha256', $dir.'/'.$table.'.jsonl');
            $info['content_digest'] = bin2hex($digest);
            if (isset($nonTransactional[$table]) && !hash_equals($nonTransactional[$table], $info['content_digest'])) {
                throw new RuntimeException('A MyISAM table changed during export; retry a new snapshot. No source locks or writes were used.');
            }
            echo $table.': '.$info['rows']." rows exported\n";
        }
        unset($info);
        foreach ($nonTransactional as $table => $digest) {
            if (!hash_equals($digest, sourceDigest($db, $table, $tables[$table]['columns']))) {
                throw new RuntimeException('A MyISAM table changed during export; retry a new snapshot.');
            }
        }
        $db->rollBack(); // Read-only snapshot; alwaysdata remains unchanged.
        file_put_contents($dir.'/manifest.json', json_encode([
            'version' => 1, 'created_at' => gmdate('c'), 'source' => 'alwaysdata',
            'omitted_data' => array_values($skip), 'tables' => $tables,
        ], JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT));
        echo "Snapshot complete. Keep storage/migration private; it contains production data.\n";
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e; // No manifest means the incomplete snapshot cannot be imported.
    }
}

function manifest(string $name): array
{
    $dir = snapshotPath($name);
    $data = json_decode(file_get_contents($dir.'/manifest.json'), true, 512, JSON_THROW_ON_ERROR);
    if (($data['version'] ?? 0) !== 1 || ($data['source'] ?? '') !== 'alwaysdata') throw new RuntimeException('Unsupported snapshot.');
    foreach ($data['tables'] as $table => $info) {
        if (!preg_match('/^[a-zA-Z0-9_]+$/', $table) || !hash_equals($info['data_sha256'], hash_file('sha256', $dir.'/'.$table.'.jsonl'))) {
            throw new RuntimeException('Snapshot integrity check failed.');
        }
    }
    return $data;
}

function importSnapshot(string $name): void
{
    $data = manifest($name);
    $db = target();
    $existing = query($db, 'SELECT table_name FROM information_schema.tables WHERE table_schema=?', [migrationSchema()]);
    if ($existing) throw new RuntimeException('Test schema is not empty. Refusing to replace any existing tables.');
    $size = (int) $db->query('SELECT pg_database_size(current_database())')->fetchColumn();
    if ($size + array_sum(array_column($data['tables'], 'estimated_bytes')) > 450 * 1024 * 1024) {
        throw new RuntimeException('Import may exceed the Free database allowance; review database size first.');
    }
    $db->beginTransaction();
    try {
        $db->exec('CREATE SCHEMA IF NOT EXISTS '.Pg::quote(migrationSchema()));
        $db->exec('REVOKE ALL ON SCHEMA '.Pg::quote(migrationSchema()).' FROM PUBLIC, anon, authenticated');
        foreach ($data['tables'] as $table => $info) {
            $enums = array_filter($info['columns'], fn ($c) => $c['DATA_TYPE'] === 'enum');
            if ($enums) {
                $scan = fopen(snapshotPath($name).'/'.$table.'.jsonl', 'rb');
                try {
                    while (($line = fgets($scan)) !== false) {
                        $row = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                        foreach ($enums as $index => $column) {
                            if ($row[$column['COLUMN_NAME']] === '') $info['columns'][$index]['ENUM_ALLOW_EMPTY'] = true;
                        }
                    }
                } finally {
                    fclose($scan);
                }
            }
            $definitions = array_map(Pg::column(...), $info['columns']);
            $primary = array_column(array_filter($info['indexes'], fn ($i) => $i['INDEX_NAME'] === 'PRIMARY'), 'COLUMN_NAME');
            if ($primary) $definitions[] = 'PRIMARY KEY ('.implode(',', array_map(Pg::quote(...), $primary)).')';
            $db->exec('CREATE TABLE '.Pg::quote($table).' ('.implode(',', $definitions).')');
            $columnNames = array_column($info['columns'], 'COLUMN_NAME');
            $batch = [];
            $file = fopen(snapshotPath($name).'/'.$table.'.jsonl', 'rb');
            try {
                while (($line = fgets($file)) !== false) {
                    $row = json_decode($line, true, 512, JSON_THROW_ON_ERROR);
                    $values = [];
                    foreach ($info['columns'] as $column) {
                        $value = $row[$column['COLUMN_NAME']];
                        if ($value !== null && Pg::binary($column)) $value = '\\x'.bin2hex(base64_decode($value, true));
                        $values[] = $value;
                    }
                    $batch[] = $values;
                    if (count($batch) >= 1000) {
                        insertBatch($db, $table, $columnNames, $batch);
                        $batch = [];
                    }
                }
                if ($batch) insertBatch($db, $table, $columnNames, $batch);
            } finally {
                fclose($file);
            }
            foreach ($info['columns'] as $column) {
                if (!str_contains($column['EXTRA'], 'auto_increment')) continue;
                $sequence = query($db, 'SELECT pg_get_serial_sequence(?, ?) AS seq', [migrationSchema().'.'.Pg::quote($table), $column['COLUMN_NAME']])[0]['seq'];
                $max = $db->query('SELECT MAX('.Pg::quote($column['COLUMN_NAME']).') FROM '.Pg::quote($table))->fetchColumn();
                query($db, 'SELECT setval(CAST(? AS regclass), CAST(? AS bigint), CAST(? AS boolean))', [$sequence, max(1, (int) $max), $max !== null && $max !== false ? 'true' : 'false']);
            }
            $indexes = [];
            foreach ($info['indexes'] as $index) $indexes[$index['INDEX_NAME']][] = $index;
            foreach ($indexes as $indexName => $columns) {
                if ($indexName === 'PRIMARY') continue;
                $indexId = 'idx_'.substr(hash('sha256', $table.'.'.$indexName), 0, 20);
                $db->exec('CREATE '.((int) $columns[0]['NON_UNIQUE'] === 0 ? 'UNIQUE ' : '').'INDEX '.Pg::quote($indexId).' ON '.Pg::quote($table)
                    .' ('.implode(',', array_map(fn ($i) => Pg::quote($i['COLUMN_NAME']), $columns)).')');
            }
            // Preserve MySQL automatic timestamp updates for legacy models without Eloquent timestamps.
            foreach ($info['columns'] as $column) {
                if (!str_contains(strtolower($column['EXTRA']), 'on update current_timestamp')) continue;
                $func = Pg::quote('touch_'.substr(hash('sha256', $table.'.'.$column['COLUMN_NAME']), 0, 20));
                $col = Pg::quote($column['COLUMN_NAME']);
                $db->exec('CREATE FUNCTION '.$func.'() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '.Pg::quote(migrationSchema())
                    .' AS $body$ BEGIN IF NEW.'.$col.' IS NOT DISTINCT FROM OLD.'.$col.' THEN NEW.'.$col.' = LOCALTIMESTAMP; END IF; RETURN NEW; END $body$');
                $db->exec('CREATE TRIGGER '.$func.' BEFORE UPDATE ON '.Pg::quote($table).' FOR EACH ROW EXECUTE FUNCTION '.$func.'()');
            }
            $db->exec('ALTER TABLE '.Pg::quote($table).' ENABLE ROW LEVEL SECURITY');
            echo $table.': imported '.$info['rows']." rows\n";
        }
        foreach ($data['tables'] as $table => $info) {
            $groups = [];
            foreach ($info['foreign_keys'] as $fk) $groups[$fk['CONSTRAINT_NAME']][] = $fk;
            foreach ($groups as $constraint => $keys) {
                $first = $keys[0];
                $rules = ['CASCADE', 'SET NULL', 'RESTRICT', 'NO ACTION', 'SET DEFAULT'];
                if (!in_array($first['UPDATE_RULE'], $rules, true) || !in_array($first['DELETE_RULE'], $rules, true)) throw new RuntimeException('Unsupported foreign key rule.');
                $db->exec('ALTER TABLE '.Pg::quote($table).' ADD CONSTRAINT '.Pg::quote('fk_'.substr(hash('sha256', $table.'.'.$constraint), 0, 20))
                    .' FOREIGN KEY ('.implode(',', array_map(fn ($f) => Pg::quote($f['COLUMN_NAME']), $keys)).') REFERENCES '.Pg::quote($first['REFERENCED_TABLE_NAME'])
                    .' ('.implode(',', array_map(fn ($f) => Pg::quote($f['REFERENCED_COLUMN_NAME']), $keys)).') ON UPDATE '.$first['UPDATE_RULE'].' ON DELETE '.$first['DELETE_RULE']);
            }
        }
        verify($db, $data); // Count AND content validation before committing.
        bootstrapTables($db);
        $db->exec('REVOKE ALL ON ALL TABLES IN SCHEMA '.Pg::quote(migrationSchema()).' FROM PUBLIC, anon, authenticated');
        $db->exec('REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA '.Pg::quote(migrationSchema()).' FROM PUBLIC, anon, authenticated');
        $db->commit();
        echo "Import committed to the designated application schema only. No alwaysdata writes or app URL changes.\n";
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

function insertBatch(PDO $db, string $table, array $columns, array $batch): void
{
    $placeholders = '('.implode(',', array_fill(0, count($columns), '?')).')';
    $sql = 'INSERT INTO '.Pg::quote($table).' ('.implode(',', array_map(Pg::quote(...), $columns)).') VALUES '
        .implode(',', array_fill(0, count($batch), $placeholders));
    $stmt = $db->prepare($sql);
    $stmt->execute(array_merge(...$batch));
}

function bootstrapTables(PDO $db): void
{
    $db->exec('CREATE TABLE IF NOT EXISTS bus_live_locations (bus_id bigint PRIMARY KEY, geojson jsonb NOT NULL, updated_at timestamp NOT NULL DEFAULT LOCALTIMESTAMP)');
    $db->exec('CREATE TABLE IF NOT EXISTS sessions (id varchar(255) PRIMARY KEY, user_id bigint, ip_address varchar(45), user_agent text, payload text NOT NULL, last_activity integer NOT NULL)');
    $db->exec('CREATE INDEX IF NOT EXISTS byahero_session_activity ON sessions (last_activity)');
    $db->exec('CREATE TABLE IF NOT EXISTS cache (key varchar(255) PRIMARY KEY, value text NOT NULL, expiration integer NOT NULL)');
    $db->exec('CREATE TABLE IF NOT EXISTS cache_locks (key varchar(255) PRIMARY KEY, owner varchar(255) NOT NULL, expiration integer NOT NULL)');
    foreach (['notifications', 'sos_alerts'] as $table) {
        if (query($db, 'SELECT 1 FROM information_schema.tables WHERE table_schema=? AND table_name=?', [migrationSchema(), $table])) {
            $db->exec('ALTER TABLE '.Pg::quote($table).' ADD COLUMN IF NOT EXISTS is_cleared smallint NOT NULL DEFAULT 0');
        }
    }
    foreach (['bus_live_locations', 'sessions', 'cache', 'cache_locks'] as $table) $db->exec('ALTER TABLE '.Pg::quote($table).' ENABLE ROW LEVEL SECURITY');
}

function verify(PDO $db, array $data): void
{
    foreach ($data['tables'] as $table => $info) {
        $stmt = $db->query('SELECT '.implode(',', array_map(fn ($c) => Pg::quote($c['COLUMN_NAME']), $info['columns'])).' FROM '.Pg::quote($table));
        $count = 0;
        $digest = str_repeat("\0", 32);
        while ($row = $stmt->fetch()) {
            $digest ^= Pg::digest($row, $info['columns'], false);
            $count++;
        }
        if ($count !== $info['rows'] || !hash_equals($info['content_digest'], bin2hex($digest))) {
            throw new RuntimeException('Row/content verification failed for '.$table.'; import will not commit.');
        }
        echo $table.": verified $count rows and content digest\n";
    }
}

function copyAssets(): void
{
    $env = settings('supabase');
    $sourceEnv = settings('migration');
    $db = target(); // Verifies the designated project and private schema.
    $base = 'https://'.PROJECT_REF.'.supabase.co';
    if (($env['SUPABASE_URL'] ?? '') !== $base || ($env['SUPABASE_STORAGE_BUCKET'] ?? '') !== migrationBucket()) {
        throw new RuntimeException('Storage must use the designated project and '.migrationBucket().' bucket.');
    }
    $bucketName = migrationBucket();
    $key = required($env, 'SUPABASE_SECRET_KEY');
    $storage = new \GuzzleHttp\Client(['base_uri' => $base, 'timeout' => 30, 'http_errors' => false,
        'headers' => ['apikey' => $key, 'Authorization' => 'Bearer '.$key]]);
    $bucket = $storage->get('/storage/v1/bucket/'.$bucketName);
    $bucketInfo = json_decode((string) $bucket->getBody(), true);
    if ($bucket->getStatusCode() === 404 || ($bucketInfo['statusCode'] ?? '') === '404') {
        $bucket = $storage->post('/storage/v1/bucket', ['json' => ['id' => $bucketName, 'name' => $bucketName, 'public' => false,
            'file_size_limit' => 8 * 1024 * 1024, 'allowed_mime_types' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif']]]);
        if ($bucket->getStatusCode() >= 300) throw new RuntimeException('Could not create the private test bucket.');
    } elseif ($bucket->getStatusCode() !== 200 || ($bucketInfo['public'] ?? true)) {
        throw new RuntimeException('The test upload bucket must be private and accessible by the server key.');
    }
    $origin = rtrim(required($sourceEnv, 'SOURCE_ASSET_BASE_URL'), '/');
    $parts = parse_url($origin);
    if (($parts['scheme'] ?? '') !== 'https' || !str_ends_with($parts['host'] ?? '', '.alwaysdata.net')) {
        throw new RuntimeException('Source assets must use the HTTPS alwaysdata origin.');
    }
    $downloads = new \GuzzleHttp\Client(['timeout' => 30, 'http_errors' => false, 'allow_redirects' => false]);
    $paths = $db->query('SELECT image1_path AS path FROM lost_and_found WHERE image1_path IS NOT NULL UNION SELECT image2_path AS path FROM lost_and_found WHERE image2_path IS NOT NULL')->fetchAll();
    $bytes = 0;
    $copied = 0;
    $missing = 0;
    $report = [];
    foreach ($paths as $entry) {
        $path = ltrim($entry['path'], '/');
        if (!preg_match('~^assets/images/uploads/lost_and_found/([a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|gif))$~i', $path, $match)) {
            throw new RuntimeException('An attachment path needs manual review before asset migration.');
        }
        $response = $downloads->get($origin.'/'.$path, ['stream' => true]);
        if ($response->getStatusCode() === 404) {
            $response->getBody()->close();
            $report[] = ['path' => $path, 'status' => 'missing_on_source'];
            $missing++;
            continue; // Preserve the database reference; copy any other available images.
        }
        $body = '';
        $stream = $response->getBody();
        while (!$stream->eof() && strlen($body) <= 8 * 1024 * 1024) {
            $body .= $stream->read(65536);
        }
        $stream->close();
        $mime = (new finfo(FILEINFO_MIME_TYPE))->buffer($body);
        if ($response->getStatusCode() !== 200 || strlen($body) > 8 * 1024 * 1024 || !in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], true)) {
            throw new RuntimeException('An existing attachment could not be copied safely (HTTP '.$response->getStatusCode().', '.$mime.', '.strlen($body).' bytes); source files are unchanged.');
        }
        $bytes += strlen($body);
        if ($bytes > 800 * 1024 * 1024) throw new RuntimeException('Asset copy stopped before the Free storage quota; review retention.');
        $upload = $storage->post('/storage/v1/object/'.$bucketName.'/lost_and_found/'.rawurlencode($match[1]), [
            'headers' => ['Content-Type' => $mime, 'x-upsert' => 'true'], 'body' => $body]);
        if ($upload->getStatusCode() >= 300) throw new RuntimeException('Attachment upload failed (HTTP '.$upload->getStatusCode().').');
        $check = $storage->get('/storage/v1/object/'.$bucketName.'/lost_and_found/'.rawurlencode($match[1]));
        if ($check->getStatusCode() !== 200 || !hash_equals(hash('sha256', $body), hash('sha256', (string) $check->getBody()))) {
            throw new RuntimeException('Attachment content verification failed.');
        }
        $report[] = ['path' => $path, 'status' => 'copied_and_verified'];
        $copied++;
    }
    $directory = dirname(__DIR__).'/storage/migration';
    if (!is_dir($directory)) mkdir($directory, 0700, true);
    file_put_contents($directory.'/'.(migrationSchema() === 'byahero_production' ? 'production-' : '').'asset-copy-report.json', json_encode($report, JSON_PRETTY_PRINT | JSON_THROW_ON_ERROR));
    echo $copied.' attachments copied and verified ('.$bytes.' bytes); '.$missing." missing on alwaysdata. References preserved.\n";
    if ($missing) exit(2);
}

try {
    $command = $argv[1] ?? 'help';
    $name = $argv[2] ?? gmdate('Ymd_His');
    if ($command === 'inspect') {
        $db = source();
        echo json_encode(query($db, 'SELECT TABLE_NAME, TABLE_TYPE, ENGINE, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME'), JSON_PRETTY_PRINT)."\n";
        echo json_encode(query($db, 'SELECT TABLE_NAME, VIEW_DEFINITION FROM information_schema.VIEWS WHERE TABLE_SCHEMA=DATABASE()'), JSON_PRETTY_PRINT)."\n";
    }
    elseif ($command === 'export') exportSnapshot($name);
    elseif ($command === 'import' && in_array('--apply', $argv, true)) importSnapshot($name);
    elseif ($command === 'verify') verify(target(), manifest($name));
    elseif ($command === 'assets' && in_array('--apply', $argv, true)) copyAssets();
    elseif ($command === 'check') {
        source();
        $db = target();
        echo "Source and designated Supabase target connections verified. No data changed.\n";
    } else {
        echo "Usage: php scripts/migrate-database.php check|export SNAPSHOT|import SNAPSHOT --apply|verify SNAPSHOT|assets --apply\n";
        if (in_array($command, ['import', 'assets'], true)) exit(1);
    }
} catch (Throwable $e) {
    // Do not print PDO diagnostics: they can include SQL bindings containing user data.
    fwrite(STDERR, $e instanceof PDOException
        ? 'Database operation failed (SQLSTATE '.$e->getCode()."). Check credentials, source access, and schema compatibility; no source writes were made.\n"
        : $e->getMessage()."\n");
    exit(1);
}
