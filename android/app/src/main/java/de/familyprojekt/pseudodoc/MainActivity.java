package de.familyprojekt.pseudodoc;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.util.Arrays;

/** Hülle „PseudoDoc Pro“ um die unveränderte Web-App (Klaus 13.11.2026, Vorbild BookLedgerPro). Eigene Seiten nur von
 *  https://localhost; jede andere Adresse geht an den Browser bzw. die zuständige App, nie in dieses Fenster mit seiner Brücke. */
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {
        registerPlugin(DoOrdnerPlugin.class);
        registerPlugin(DoUpdatesPlugin.class);
        registerPlugin(DoEingangPlugin.class);
        registerPlugin(DoDateienPlugin.class);
        super.onCreate(state);
        if (bridge == null) return;
        // Wie BookLedgerPro: die WebView übernimmt sonst die Systemschrift (textZoom) und die App wirkt größer als die PWA.
        bridge.getWebView().getSettings().setTextZoom(100);
        bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
            // Fällt die Anzeige aus (z. B. Speichermangel bei großen Mengen), Fenster neu aufbauen statt die App zu beenden.
            // Die Sortierung liegt gemerkt in der App (IndexedDB), der Ordner muss danach neu gewählt werden.
            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                android.util.Log.e("PseudoDoc", "Anzeige ausgefallen, Fenster wird neu aufgebaut");
                try { android.view.ViewParent p = view.getParent(); if (p instanceof android.view.ViewGroup) ((android.view.ViewGroup) p).removeView(view); }
                catch (Exception egal) { /* weiter mit Neuaufbau */ }
                runOnUiThread(MainActivity.this::recreate);
                return true;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if ("https".equals(uri.getScheme()) && "localhost".equals(uri.getHost()) && uri.getPort() == -1)
                    return super.shouldOverrideUrlLoading(view, request);
                boolean erlaubt = request.isForMainFrame() && Arrays.asList("http", "https", "mailto", "tel").contains(uri.getScheme())
                    && (request.hasGesture() || NativeUtil.eigeneAdresse(uri.getScheme(), uri.getHost()));
                if (erlaubt) {
                    try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                    catch (Exception none) { android.widget.Toast.makeText(MainActivity.this, "Keine App für diese Adresse", android.widget.Toast.LENGTH_SHORT).show(); }
                }
                return true;
            }
        });
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                if (bridge == null) { moveTaskToBack(true); return; }
                WebView web = bridge.getWebView();
                if (web.canGoBack()) web.goBack(); else moveTaskToBack(true);
            }
        });
    }
}
