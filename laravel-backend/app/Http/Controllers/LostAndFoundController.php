<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\LostAndFound;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\File;

class LostAndFoundController extends Controller
{
    public function create(Request $request)
    {
        $userId = Session::get('user_id', 0);
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $type = $request->input('itemType', 'lost');
        $description = $request->input('description', '');
        $busNumber = $request->input('bus_number');
        if (trim((string)$busNumber) === '') {
            $busNumber = null;
        }

        $uploadDir = base_path('../assets/images/uploads/lost_and_found/');
        if (!File::isDirectory($uploadDir)) {
            File::makeDirectory($uploadDir, 0777, true, true);
        }

        $image1_path = null;
        $image2_path = null;

        if ($request->hasFile('images')) {
            $files = $request->file('images');
            // Handle both single file and array uploads
            if (!is_array($files)) {
                $files = [$files];
            }

            $count = 0;
            foreach ($files as $file) {
                if ($count >= 2) break;
                if ($file->isValid()) {
                    $ext = strtolower($file->getClientOriginalExtension());
                    $filename = uniqid('lf_') . '.' . $ext;
                    $file->move($uploadDir, $filename);

                    $dbPath = 'assets/images/uploads/lost_and_found/' . $filename;
                    if ($count === 0) {
                        $image1_path = $dbPath;
                    } else {
                        $image2_path = $dbPath;
                    }
                    $count++;
                }
            }
        }

        try {
            LostAndFound::create([
                'user_id' => $userId,
                'type' => $type,
                'item_description' => $description,
                'bus_number' => $busNumber,
                'image1_path' => $image1_path,
                'image2_path' => $image2_path,
                'status' => 'open' // Default status
            ]);

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    }

    public function myReports(Request $request)
    {
        $userId = Session::get('user_id');
        if (empty($userId)) {
            return response()->json(['success' => false, 'message' => 'Not logged in'], 401);
        }

        $action = $request->input('action');
        $message = '';
        $error = '';

        if ($request->isMethod('post') && $action === 'resolve') {
            $ticketId = $request->input('ticket_id');
            if ($ticketId) {
                $affected = LostAndFound::where('id', $ticketId)
                    ->where('user_id', $userId)
                    ->where('status', 'open')
                    ->update(['status' => 'resolved']);

                if ($affected > 0) {
                    $message = "Report successfully marked as resolved!";
                } else {
                    $error = "Action failed. Either the report was already resolved or you lack permission.";
                }
            }
        }

        $reports = LostAndFound::where('user_id', $userId)
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'success' => empty($error),
            'reports' => $reports,
            'message' => $message,
            'error' => $error
        ]);
    }
}
