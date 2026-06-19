package com.byahero.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.webkit.PermissionRequest;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

public class MainActivity extends BridgeActivity {
    private static final int CAMERA_PERMISSION_REQUEST = 12345;
    private PermissionRequest pendingPermissionRequest;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Set overscroll mode to never on the webview to stop the "stretch" effect
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
            
            // Set our custom BridgeWebChromeClient that overrides only onPermissionRequest
            webView.setWebChromeClient(new BridgeWebChromeClient(getBridge()) {
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        boolean hasCameraRequest = false;
                        for (String resource : request.getResources()) {
                            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resource)) {
                                hasCameraRequest = true;
                                break;
                            }
                        }
                        
                        if (hasCameraRequest) {
                            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA)
                                    == PackageManager.PERMISSION_GRANTED) {
                                request.grant(request.getResources());
                            } else {
                                pendingPermissionRequest = request;
                                ActivityCompat.requestPermissions(MainActivity.this,
                                        new String[]{ Manifest.permission.CAMERA }, CAMERA_PERMISSION_REQUEST);
                            }
                        } else {
                            // Let the parent client handle other permissions
                            super.onPermissionRequest(request);
                        }
                    } else {
                        super.onPermissionRequest(request);
                    }
                }
            });
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == CAMERA_PERMISSION_REQUEST) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                if (pendingPermissionRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                }
            } else {
                if (pendingPermissionRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    pendingPermissionRequest.deny();
                }
            }
            pendingPermissionRequest = null;
        }
    }
}