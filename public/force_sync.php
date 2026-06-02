<?php
/**
 * ByaHero Database Force Synchronization Utility
 * Visually confirms schema sync and checks table structures.
 */

require_once __DIR__ . '/../config/db.php';

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ByaHero - DB Sync Center</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-grad: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            --glass-bg: rgba(255, 255, 255, 0.03);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-primary: #f8fafc;
            --text-secondary: #94a3b8;
            --accent-green: #10b981;
            --accent-blue: #3b82f6;
            --accent-red: #ef4444;
        }
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Outfit', sans-serif;
        }

        body {
            background: var(--bg-grad);
            min-height: 100vh;
            color: var(--text-primary);
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            width: 100%;
            max-width: 600px;
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: 24px;
            padding: 40px;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.6s ease-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        h1 {
            font-size: 2rem;
            font-weight: 800;
            margin-bottom: 8px;
            background: linear-gradient(to right, #3b82f6, #8b5cf6, #ec4899);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-align: center;
        }

        .subtitle {
            font-size: 0.95rem;
            color: var(--text-secondary);
            text-align: center;
            margin-bottom: 30px;
        }

        .status-card {
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            border: 1px solid var(--glass-border);
            background: rgba(255, 255, 255, 0.01);
        }

        .status-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .status-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            display: inline-block;
        }

        .status-dot.success {
            background-color: var(--accent-green);
            box-shadow: 0 0 12px var(--accent-green);
        }

        .status-dot.error {
            background-color: var(--accent-red);
            box-shadow: 0 0 12px var(--accent-red);
        }

        .column-list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 15px;
        }

        .column-item {
            display: flex;
            justify-content: space-between;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid var(--glass-border);
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 0.88rem;
        }

        .column-name {
            font-weight: 600;
            color: var(--accent-blue);
        }

        .column-type {
            color: var(--text-secondary);
            font-family: monospace;
        }

        .btn {
            display: block;
            width: 100%;
            padding: 14px;
            border-radius: 12px;
            border: none;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            text-decoration: none;
            transition: all 0.3s ease;
            background: linear-gradient(90deg, #2563eb, #7c3aed);
            color: white;
            box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(124, 58, 237, 0.5);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>ByaHero Sync Center</h1>
        <p class="subtitle">Ensures your production & local databases are in perfect alignment.</p>

        <?php
        try {
            // Trigger automatic synchronization
            $conn = db();
            
            // Query passenger_rides schema
            $res = $conn->query("DESCRIBE passenger_rides");
            $columns = [];
            if ($res) {
                while ($row = $res->fetch_assoc()) {
                    $columns[] = $row;
                }
            }
            
            $hasOperationId = false;
            foreach ($columns as $col) {
                if ($col['Field'] === 'operation_id') {
                    $hasOperationId = true;
                    break;
                }
            }
            ?>
            <div class="status-card">
                <div class="status-header">
                    <span class="status-dot success"></span>
                    <span>Database Connected Successfully</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                    Migration runner completed. Below is the active schema detected for <strong>passenger_rides</strong>:
                </p>
                
                <ul class="column-list">
                    <?php foreach ($columns as $col): ?>
                        <li class="column-item">
                            <span class="column-name">
                                <?= htmlspecialchars($col['Field']) ?>
                                <?php if ($col['Field'] === 'operation_id'): ?>
                                    <span style="color: var(--accent-green); font-size: 0.75rem; margin-left: 6px;">[MIGRATED]</span>
                                <?php endif; ?>
                            </span>
                            <span class="column-type"><?= htmlspecialchars($col['Type']) ?></span>
                        </li>
                    <?php endforeach; ?>
                </ul>
            </div>
            
            <?php if ($hasOperationId): ?>
                <div style="text-align: center; margin-bottom: 24px; color: var(--accent-green); font-weight: 600; font-size: 0.95rem;">
                    ✓ Autoboarding schema is fully active!
                </div>
            <?php else: ?>
                <div style="text-align: center; margin-bottom: 24px; color: var(--accent-red); font-weight: 600; font-size: 0.95rem;">
                    ⚠ Migration is pending or failed to execute.
                </div>
            <?php endif; ?>
            
        <?php
        } catch (Exception $e) {
            ?>
            <div class="status-card" style="border-color: var(--accent-red);">
                <div class="status-header" style="color: var(--accent-red);">
                    <span class="status-dot error"></span>
                    <span>Database Error Encountered</span>
                </div>
                <p style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 10px;">
                    An error occurred during schema synchronization:
                </p>
                <code style="display: block; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); padding: 12px; border-radius: 8px; font-family: monospace; font-size: 0.85rem; color: #f87171; white-space: pre-wrap; word-break: break-all;"><?= htmlspecialchars($e->getMessage()) ?></code>
            </div>
            <?php
        }
        ?>

        <a href="passenger/index.php" class="btn">Return to Passenger Live Map</a>
    </div>
</body>
</html>
