package com.obsidian.protocol;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.window.OnBackInvokedDispatcher;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;

/** Android owns lifecycle, insets and Back. The WebView loads exclusively from APK assets. */
public final class GameActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    private AlertDialog exitDialog;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(8, 9, 22));
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(8, 9, 22));
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportZoom(false);
        settings.setTextZoom(100);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String path = request.getUrl().getPath();
                if (!"https".equals(request.getUrl().getScheme()) || !HOST.equals(request.getUrl().getHost())
                        || path == null || !path.matches("/[a-zA-Z0-9_./-]+") || path.contains(".."))
                    return missing();
                try {
                    return new WebResourceResponse(mime(path), path.endsWith(".png") ? null : "UTF-8",
                            getAssets().open("www" + path));
                } catch (IOException ignored) {
                    return missing();
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost()) || !"https".equals(request.getUrl().getScheme());
            }
        });
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int left = 0, right = 0, top = 0, bottom = 0;
            if (Build.VERSION.SDK_INT >= 28 && insets.getDisplayCutout() != null) {
                left = insets.getDisplayCutout().getSafeInsetLeft();
                right = insets.getDisplayCutout().getSafeInsetRight();
                top = insets.getDisplayCutout().getSafeInsetTop();
                bottom = insets.getDisplayCutout().getSafeInsetBottom();
            }
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.mandatorySystemGestures() | WindowInsets.Type.ime());
                left = Math.max(left, bars.left); right = Math.max(right, bars.right);
                top = Math.max(top, bars.top); bottom = Math.max(bottom, bars.bottom);
            }
            v.setPadding(left, top, right, bottom);
            return insets;
        });
        immersive();
        root.requestApplyInsets();
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
        web.loadUrl("https://" + HOST + "/index.html");
    }

    private static String mime(String path) {
        String name = path.toLowerCase(Locale.ROOT);
        if (name.endsWith(".js")) return "text/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".json")) return "application/json";
        return "text/html";
    }

    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null,
                new ByteArrayInputStream(new byte[0]));
    }

    private void immersive() {
        if (Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
            WindowInsetsController controller = getWindow().getInsetsController();
            if (controller != null) {
                controller.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
                controller.hide(WindowInsets.Type.systemBars());
            }
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
    }

    @Override public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    @Override public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (exitDialog != null && exitDialog.isShowing()) return;
        web.evaluateJavascript("window.obsidianBack ? window.obsidianBack() : 'exit'", result -> {
            if (!"\"exit\"".equals(result) && !"\"run-exit\"".equals(result)) return;
            if (isFinishing() || isDestroyed()) return;
            exitDialog = new AlertDialog.Builder(this).setTitle("退出黑曜防线？")
                    .setMessage("\"run-exit\"".equals(result) ? "退出会结束这场未结算的行动。" : "基地进度已保存在手机上。")
                    .setNegativeButton("留在游戏", null)
                    .setPositiveButton("退出", (dialog, which) -> finish()).show();
        });
    }

    @Override protected void onPause() {
        super.onPause();
        web.evaluateJavascript("window.obsidianLifecycle && window.obsidianLifecycle(true)", null);
        web.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        web.onResume();
        web.evaluateJavascript("window.obsidianLifecycle && window.obsidianLifecycle(false)", null);
    }

    @Override protected void onDestroy() {
        if (exitDialog != null) exitDialog.dismiss();
        ((android.view.ViewGroup) web.getParent()).removeView(web);
        web.destroy();
        super.onDestroy();
    }
}
