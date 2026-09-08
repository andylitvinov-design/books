package app.psialchemy.mobile;

import android.app.Activity;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebStorage;
import android.webkit.WebView;
import android.webkit.WebViewDatabase;
import java.util.HashMap;
import java.util.Map;

/**
 * Disabled isolated-process container reserved for future private-link use.
 * It is deliberately not exported and has no intent filter.
 */
public final class PrivatePrescriptionActivity extends Activity {
    private WebView privateWebView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WebView.setDataDirectorySuffix("private-prescription");
        }
        super.onCreate(savedInstanceState);
        if (!NativePrivatePrescriptionGate.ENABLED) {
            finishAndRemoveTask();
            return;
        }

        Uri privateUrl = getIntent().getData();
        if (!isAllowedPrivateUrl(privateUrl)) {
            finishAndRemoveTask();
            return;
        }

        privateWebView = new WebView(this);
        WebSettings settings = privateWebView.getSettings();
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setDomStorageEnabled(false);
        settings.setDatabaseEnabled(false);
        settings.setSaveFormData(false);
        setContentView(privateWebView);
        Map<String, String> noStoreHeaders = new HashMap<>();
        noStoreHeaders.put("Cache-Control", "no-store");
        privateWebView.loadUrl(privateUrl.toString(), noStoreHeaders);
    }

    @Override
    protected void onDestroy() {
        if (privateWebView != null) {
            privateWebView.stopLoading();
            privateWebView.loadUrl("about:blank");
            privateWebView.clearHistory();
            privateWebView.clearCache(true);
            privateWebView.removeAllViews();
            privateWebView.destroy();
            privateWebView = null;
        }
        CookieManager.getInstance().removeAllCookies(null);
        CookieManager.getInstance().flush();
        WebStorage.getInstance().deleteAllData();
        WebViewDatabase.getInstance(this).clearHttpAuthUsernamePassword();
        WebViewDatabase.getInstance(this).clearFormData();
        super.onDestroy();

        // This activity always runs in the dedicated :private process.
        new Handler(Looper.getMainLooper()).post(() -> Process.killProcess(Process.myPid()));
    }

    private boolean isAllowedPrivateUrl(Uri uri) {
        if (uri == null || !"https".equals(uri.getScheme())
                || !"codex-public-book-library.vercel.app".equals(uri.getHost())) return false;
        String path = uri.getPath();
        return path != null && path.matches("/(ru|en)/prescriptions/[^/]+");
    }
}
