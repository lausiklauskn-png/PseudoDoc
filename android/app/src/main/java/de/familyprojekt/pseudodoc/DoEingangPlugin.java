package de.familyprojekt.pseudodoc;

import android.content.ClipData;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/**
 * Teilen an PseudoDoc Pro und „Öffnen mit“ (Klaus 13.11.2026, Liste der Android-Lücken). Angenommen werden nur content-Adressen
 * aus einer SEND/SEND_MULTIPLE/VIEW-Anfrage, nie eine Adresse aus der Seite. Die Dateien werden sofort als KOPIE in einen Stapel im
 * App-Speicher gelegt (EingangStapel, gleiche Bauweise wie Windows), danach meldet die App „neu“; die Seite holt den Stapel ab und
 * nimmt die Dateien zum Bestand dazu (wie Hineinziehen). Originale werden nie verändert.
 */
@CapacitorPlugin(name = "DoEingang")
public final class DoEingangPlugin extends Plugin {
    private final PluginWorker worker = new PluginWorker("eingang");
    private EingangStapel stapel;
    private Intent zuletzt;

    @Override public void load() {
        try { stapel = new EingangStapel(new File(getContext().getFilesDir(), "eingang-v1")); }
        catch (IOException keinPlatz) { stapel = null; return; }
        worker.execute(() -> stapel.aufraeumen(System.currentTimeMillis()));
        if (getActivity() != null) annehmen(getActivity().getIntent());
    }
    @Override protected void handleOnNewIntent(Intent intent) { super.handleOnNewIntent(intent); annehmen(intent); }

    private void annehmen(Intent intent) {
        if (intent == null || intent == zuletzt || stapel == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action) && !Intent.ACTION_VIEW.equals(action)) return;
        zuletzt = intent;
        LinkedHashSet<Uri> uris = new LinkedHashSet<>();
        if (Intent.ACTION_VIEW.equals(action)) { if (intent.getData() != null) uris.add(intent.getData()); }
        else if (Intent.ACTION_SEND.equals(action)) { Uri u = intent.getParcelableExtra(Intent.EXTRA_STREAM); if (u != null) uris.add(u); }
        else { ArrayList<Uri> l = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM); if (l != null) uris.addAll(l); }
        ClipData clip = intent.getClipData();
        if (uris.isEmpty() && clip != null && !Intent.ACTION_VIEW.equals(action)) for (int i = 0; i < clip.getItemCount(); i++) { Uri u = clip.getItemAt(i).getUri(); if (u != null) uris.add(u); }
        // Nicht noch einmal annehmen, wenn das Fenster neu aufgebaut wird.
        if (getActivity() != null) getActivity().setIntent(new Intent(Intent.ACTION_MAIN));
        List<EingangStapel.Quelle> quellen = new ArrayList<>();
        ContentResolver cr = getContext().getContentResolver();
        for (Uri u : uris) {
            if (!"content".equals(u.getScheme()) || u.getAuthority() == null) continue;
            quellen.add(new EingangStapel.Quelle() {
                public String name() { return anzeigeName(cr, u); }
                public InputStream oeffnen() throws IOException { return cr.openInputStream(u); }
            });
        }
        if (quellen.isEmpty()) return;
        worker.execute(() -> {
            try { int n = stapel.aufnehmen(quellen, System.currentTimeMillis()); if (n > 0) notifyListeners("neu", new JSObject().put("neu", n), true); }
            catch (Exception egal) { android.util.Log.w("PseudoDoc", "Teilen: nicht übernommen"); }
        });
    }
    private static String anzeigeName(ContentResolver cr, Uri u) {
        try (Cursor c = cr.query(u, new String[] { OpenableColumns.DISPLAY_NAME }, null, null, null)) {
            if (c != null && c.moveToFirst() && !c.isNull(0)) return c.getString(0);
        } catch (Exception unbekannt) { /* Name aus der Adresse */ }
        String s = u.getLastPathSegment(); return s == null ? "Datei" : s;
    }

    @PluginMethod public void abholen(PluginCall call) {
        worker.submit(call, () -> {
            try {
                if (stapel == null) throw new IOException("PD_EINGANG_FEHLT");
                EingangStapel.Abgeholt a = stapel.abholen();
                JSArray d = new JSArray();
                if (a != null) for (EingangStapel.Datei x : a.dateien) d.put(new JSObject().put("name", x.name).put("groesse", x.groesse).put("geaendert", x.geaendert));
                call.resolve(new JSObject().put("stapel", a == null ? "" : a.stapel).put("dateien", d).put("weitere", a == null ? 0 : a.weitere));
            } catch (Exception e) { call.reject(fehler(e), fehler(e)); }
        });
    }
    @PluginMethod public void lesen(PluginCall call) {
        worker.submit(call, () -> {
            try {
                if (stapel == null) throw new IOException("PD_EINGANG_FEHLT");
                byte[] b = stapel.lesen(call.getString("stapel", ""), call.getString("name", ""),
                    NativeUtil.zahl(call.getData().opt("offset"), 0L), (int) NativeUtil.zahl(call.getData().opt("laenge"), 0L));
                call.resolve(new JSObject().put("data", Base64.encodeToString(b, Base64.NO_WRAP)));
            } catch (Exception e) { call.reject(fehler(e), fehler(e)); }
        });
    }
    private static String fehler(Exception e) { String m = e.getMessage(); return m != null && m.matches("[A-Z0-9_]{3,60}") ? m : "PD_EINGANG_FEHLT"; }

    @Override protected void handleOnDestroy() { worker.close(() -> { }); }
}
