<?php
declare(strict_types=1);

require __DIR__ . '/../../config/db.php';

session_start();

// Check admin authentication
if (empty($_SESSION['user_role']) || $_SESSION['user_role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

header('Content-Type: application/json');

try {
    $pdo = db();
    
    // 1. Overview Stats
    $totalEvents = $pdo->query("SELECT COUNT(*) as count FROM analytics_events")->fetch(PDO::FETCH_ASSOC)['count'];
    
    $activeUsers = $pdo->query("SELECT COUNT(DISTINCT user_id) as count FROM analytics_events WHERE user_id IS NOT NULL")->fetch(PDO::FETCH_ASSOC)['count'];
    
    $pageViews = $pdo->query("SELECT COUNT(*) as count FROM analytics_events WHERE event_type = 'page_view'")->fetch(PDO::FETCH_ASSOC)['count'];
    
    $totalFeedback = $pdo->query("SELECT COUNT(*) as count FROM feedbacks")->fetch(PDO::FETCH_ASSOC)['count'];
    
    // 2. Event Types Distribution
    $eventTypes = $pdo->query("
        SELECT event_type, COUNT(*) as count 
        FROM analytics_events 
        GROUP BY event_type 
        ORDER BY count DESC 
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // 3. Most Changed Settings
    $topSettings = $pdo->query("
        SELECT JSON_EXTRACT(event_data, '$.setting') as setting, COUNT(*) as change_count
        FROM analytics_events 
        WHERE event_type = 'setting_changed'
        GROUP BY setting
        ORDER BY change_count DESC
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // 4. Most Tracked Buses
    $topBuses = $pdo->query("
        SELECT JSON_EXTRACT(event_data, '$.bus_id') as bus_id, COUNT(*) as track_count
        FROM analytics_events 
        WHERE event_type = 'bus_tracked'
        GROUP BY bus_id
        ORDER BY track_count DESC
        LIMIT 10
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // 5. Feedback Ratings Distribution
    $feedbackRatings = $pdo->query("
        SELECT rating, COUNT(*) as count 
        FROM feedbacks 
        WHERE rating IS NOT NULL
        GROUP BY rating
        ORDER BY count DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // 6. Recent Activity (last 20 events)
    $recentActivity = $pdo->query("
        SELECT event_type, event_data, page, created_at 
        FROM analytics_events 
        ORDER BY created_at DESC 
        LIMIT 20
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Return response
    echo json_encode([
        'success' => true,
        'overview' => [
            'total_events' => $totalEvents,
            'active_users' => $activeUsers,
            'page_views' => $pageViews,
            'total_feedback' => $totalFeedback
        ],
        'event_types' => $eventTypes,
        'top_settings' => $topSettings,
        'top_buses' => $topBuses,
        'feedback_ratings' => $feedbackRatings,
        'recent_activity' => $recentActivity
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Error loading analytics: ' . $e->getMessage()
    ]);
}
?>