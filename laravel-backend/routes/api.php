<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\SosController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\BusController;
use App\Http\Controllers\LostAndFoundController;
use App\Http\Controllers\AdminController;
use App\Http\Controllers\ConductorController;
use App\Http\Controllers\ProfileController;

Route::middleware([
    \Illuminate\Cookie\Middleware\EncryptCookies::class,
    \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
    \Illuminate\Session\Middleware\StartSession::class,
])->group(function () {
    Route::post('/auth', [AuthController::class, 'handle']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/ping', function () {
        return response()->json(['success' => true, 'status' => 'online', 'message' => 'ByaHero Laravel API is warm']);
    });

    Route::post('/sos/send', [SosController::class, 'sendSosAlert']);
    Route::get('/sos/alerts', [SosController::class, 'getSosAlerts']);

    Route::get('/group/view', [GroupController::class, 'groupView']);
    Route::post('/group/join', [GroupController::class, 'joinCircle']);
    Route::post('/group/remove', [GroupController::class, 'removeFriend']);
    Route::get('/group/invite-code', [GroupController::class, 'getInviteCode']);

    Route::get('/settings/fetch', [SettingsController::class, 'fetch']);
    Route::post('/settings/update', [SettingsController::class, 'update']);
    Route::get('/settings/privacy', [SettingsController::class, 'getPrivacy']);
    Route::get('/settings/share-location', [SettingsController::class, 'getShareLocation']);
    Route::post('/settings/feedback', [SettingsController::class, 'submitFeedback']);

    Route::post('/fcm/register', [NotificationController::class, 'registerFcmToken']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'getUnreadCount']);
    Route::get('/notifications/unread-status', [NotificationController::class, 'getUnreadStatus']);
    Route::get('/notifications/fetch', [NotificationController::class, 'getNotifications']);
    Route::post('/notifications/mark-read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/create', [NotificationController::class, 'createNotification']);
    Route::get('/notifications', [NotificationController::class, 'notificationsIndex']);

    Route::get('/buses', [BusController::class, 'getBuses']);
    Route::get('/buses/stops-terminal', [BusController::class, 'getBusStopsTerminal']);
    Route::get('/buses/sync', [BusController::class, 'getSyncData']);
    Route::get('/buses/history', [BusController::class, 'getRideHistory']);
    Route::post('/location/update', [BusController::class, 'updateUserLocation']);

    Route::post('/lost-and-found/create', [LostAndFoundController::class, 'create']);
    Route::match(['get', 'post'], '/lost-and-found/my-reports', [LostAndFoundController::class, 'myReports']);

    // Admin routes
    Route::get('/admin/staff', [AdminController::class, 'listStaff']);
    Route::post('/admin/staff', [AdminController::class, 'manageStaff']);
    Route::get('/admin/buses', [AdminController::class, 'listBuses']);
    Route::post('/admin/buses', [AdminController::class, 'manageBuses']);
    Route::get('/admin/stops', [AdminController::class, 'listStops']);
    Route::post('/admin/stops', [AdminController::class, 'manageStops']);
    Route::get('/admin/schedules', [AdminController::class, 'listSchedules']);
    Route::post('/admin/schedules', [AdminController::class, 'manageSchedules']);
    Route::get('/admin/feedbacks', [AdminController::class, 'listFeedbacks']);
    Route::post('/admin/feedbacks/delete', [AdminController::class, 'deleteFeedback']);
    Route::get('/admin/analytics', [AdminController::class, 'getAnalytics']);
    Route::get('/admin/active-buses', [AdminController::class, 'listActiveBuses']);
    Route::get('/admin/waiting-passengers', [AdminController::class, 'listWaitingPassengers']);
    Route::post('/admin/waiting-passengers', [AdminController::class, 'manageWaitingPassengers']);
    Route::match(['get', 'post'], '/admin/profile', [AdminController::class, 'updateProfile']);

    // Conductor routes
    Route::match(['get', 'post'], '/conductor/status', [ConductorController::class, 'getStatus']);
    Route::post('/conductor/claim', [ConductorController::class, 'claimBus']);
    Route::get('/conductor/buses', [ConductorController::class, 'getBuses']);
    Route::post('/conductor/start', [ConductorController::class, 'start']);
    Route::post('/conductor/update-location', [ConductorController::class, 'updateLocation']);
    Route::post('/conductor/stop', [ConductorController::class, 'stop']);
    Route::match(['get', 'post'], '/conductor/profile', [ConductorController::class, 'updateProfile']);

    // Passenger profile routes
    Route::match(['get', 'post'], '/passenger/profile/account-settings', [ProfileController::class, 'updateAccountSettings']);
    Route::get('/passenger/profile/login-activity', [ProfileController::class, 'getLoginActivity']);
    Route::match(['get', 'post'], '/passenger/profile/change-password', [ProfileController::class, 'changePassword']);
});
