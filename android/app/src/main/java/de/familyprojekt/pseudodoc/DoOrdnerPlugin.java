package de.familyprojekt.pseudodoc;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.DocumentsContract;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.UriPermission;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Ordner auf dem Gerät (Gerätespeicher, SD-Karte, USB) für große Mengen (Klaus 13.11.2026). Gleicher Name und gleiche Aufrufe wie
 * der Ordnerweg der Familienakte Pro („FamilyFolders“), damit src/quellen.ts (nativWaehlen) unverändert in beiden Apps läuft.
 * Androids Speicherzugriff (ACTION_OPEN_DOCUMENT_TREE); die Seite bekommt nur eine Kennung, nie eine Adresse. Eine Ordnerliste ist
 * EINE Abfrage je Ordner (Name, Art, Größe, Änderungsdatum zusammen); Dateien werden in Stücken bis 1 MiB gelesen. Geschrieben wird
 * nur eine .json-Datei direkt im gewählten Ordner (organizer-index.json) oder direkt im Arbeitsordner „PseudoDoc-Arbeit“ (0.4.3). Originale werden nie verändert, nichts wird gelöscht.
 * Dauerhafte Freigabe (0.4.1, Klaus' Liste „Ordnerfreigabe merken“): die App nimmt Androids dauerhafte Freigabe
 * (takePersistableUriPermission) und merkt sich die zuletzt gewählten Ordner (höchstens 5, OrdnerMerkliste) mit Namen; „gemerkt“
 * zeigt sie, „wiederOeffnen“ öffnet ohne Auswahl-Fenster, „vergessen“ gibt die Freigabe an Android zurück.
 * Zahlen nie über call.getLong (NativeUtil.zahl).
 */
@CapacitorPlugin(name = "FamilyFolders")
public final class DoOrdnerPlugin extends Plugin {
    private final PluginWorker worker = new PluginWorker("ordner");
    private final Map<String, Baum> ordner = new HashMap<>();
    private final Map<String, Schreiben> offen = new HashMap<>();

    private static final class Baum {
        final Uri baum; final Map<String, String> ids = new HashMap<>(); final Map<String, Boolean> istOrdner = new HashMap<>();
        Baum(Uri baum, String wurzel) { this.baum = baum; ids.put("", wurzel); istOrdner.put("", true); }
    }
    private static final class Schreiben { Baum baum; String name; OutputStream out; long groesse; MessageDigest sha; }
    private interface Arbeit { JSObject run() throws Exception; }

    private void arbeit(PluginCall call, Arbeit a) {
        worker.submit(call, () -> {
            try { call.resolve(a.run()); }
            catch (Exception e) {
                String m = e.getMessage() == null ? "" : e.getMessage();
                call.reject(m.matches("[A-Z0-9_]{3,60}") ? m : "PD_ORDNER_NICHT_ERREICHBAR", m.matches("[A-Z0-9_]{3,60}") ? m : "PD_ORDNER_NICHT_ERREICHBAR");
            }
        });
    }
    private ContentResolver cr() { return getContext().getContentResolver(); }
    private Baum baum(PluginCall call) throws IOException {
        Baum b = ordner.get(call.getString("token", ""));
        if (b == null) throw new IOException("PD_ORDNER_NICHT_ERREICHBAR");
        return b;
    }
    private static String pfad(PluginCall call) throws IOException {
        String p = call.getString("pfad", "");
        if (!NativeUtil.pfadGueltig(p)) throw new IOException("PD_PFAD_UNGUELTIG");
        return p;
    }
    private static long zahl(PluginCall call, String name, long ersatz) { return NativeUtil.zahl(call.getData().opt(name), ersatz); }

    @PluginMethod public void ordnerWaehlen(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "ordnerGewaehlt");
    }
    @ActivityCallback private void ordnerGewaehlt(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) { call.resolve(new JSObject().put("cancelled", true)); return; }
        Uri uri = data.getData();
        arbeit(call, () -> {
            JSObject aus = oeffnen(uri);
            // Dauerhaft merken (übersteht Neustart); geht es nicht (Anbieter ohne dauerhafte Freigabe), gilt sie nur bis zum Schließen.
            boolean dauer = true;
            try { cr().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); }
            catch (SecurityException nurLesen) {
                try { cr().takePersistableUriPermission(uri, Intent.FLAG_GRANT_READ_URI_PERMISSION); } catch (SecurityException keinDauer) { dauer = false; }
            }
            if (dauer) aus.put("id", merken(uri, aus.getString("name")));
            return aus;
        });
    }
    private JSObject oeffnen(Uri uri) throws IOException {
        String wurzel = DocumentsContract.getTreeDocumentId(uri);
        Baum b = new Baum(uri, wurzel);
        liste(b, ""); // Probe: lesbar
        String token = UUID.randomUUID().toString(); ordner.put(token, b);
        String name = wurzel; int i = name.lastIndexOf(':'); if (i >= 0) name = name.substring(i + 1);
        i = name.lastIndexOf('/'); if (i >= 0) name = name.substring(i + 1);
        return new JSObject().put("token", token).put("name", name.isEmpty() ? "Speicher" : name);
    }

    // ---------- Gemerkte Ordner (SharedPreferences: Reihenfolge der Kennungen, je Kennung Name und Adresse) ----------
    private SharedPreferences prefs() { return getContext().getSharedPreferences("do_ordner_v1", Context.MODE_PRIVATE); }
    private synchronized String merken(Uri uri, String name) {
        SharedPreferences p = prefs();
        java.util.List<String> alt = OrdnerMerkliste.trennen(p.getString("liste", ""));
        String id = null;
        for (String a : alt) if (uri.toString().equals(p.getString("uri_" + a, null))) id = a;
        if (id == null) id = UUID.randomUUID().toString();
        java.util.List<String> neu = OrdnerMerkliste.vorn(alt, id);
        SharedPreferences.Editor e = p.edit().putString("liste", OrdnerMerkliste.verbinden(neu)).putString("uri_" + id, uri.toString()).putString("name_" + id, name);
        for (String weg : OrdnerMerkliste.heraus(alt, neu)) { freigeben(p.getString("uri_" + weg, null)); e.remove("uri_" + weg).remove("name_" + weg); }
        e.apply();
        return id;
    }
    private void freigeben(String uri) {
        if (uri == null) return;
        try { cr().releasePersistableUriPermission(Uri.parse(uri), Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION); }
        catch (SecurityException schonWeg) { /* nichts zu tun */ }
    }
    private boolean freigabeDa(String uri) {
        if (uri == null) return false;
        for (UriPermission f : cr().getPersistedUriPermissions()) if (f.getUri().toString().equals(uri) && f.isReadPermission()) return true;
        return false;
    }
    @PluginMethod public void gemerkt(PluginCall call) {
        arbeit(call, () -> {
            SharedPreferences p = prefs(); JSArray aus = new JSArray();
            for (String id : OrdnerMerkliste.trennen(p.getString("liste", ""))) {
                String uri = p.getString("uri_" + id, null);
                aus.put(new JSObject().put("id", id).put("name", p.getString("name_" + id, "Ordner")).put("da", freigabeDa(uri)));
            }
            return new JSObject().put("ordner", aus);
        });
    }
    @PluginMethod public void wiederOeffnen(PluginCall call) {
        arbeit(call, () -> {
            String id = call.getString("id", ""), uri = id.isEmpty() ? null : prefs().getString("uri_" + id, null);
            if (!freigabeDa(uri)) throw new IOException("PD_FREIGABE_FEHLT");
            try { JSObject aus = oeffnen(Uri.parse(uri)); merken(Uri.parse(uri), aus.getString("name")); return aus.put("id", id); }
            catch (IOException | SecurityException | IllegalArgumentException weg) { throw new IOException("PD_FREIGABE_FEHLT"); }
        });
    }
    @PluginMethod public void vergessen(PluginCall call) {
        arbeit(call, () -> {
            String id = call.getString("id", ""); SharedPreferences p = prefs();
            java.util.List<String> alt = OrdnerMerkliste.trennen(p.getString("liste", "")), neu = new java.util.ArrayList<>(alt);
            neu.remove(id);
            if (alt.contains(id)) { freigeben(p.getString("uri_" + id, null)); p.edit().putString("liste", OrdnerMerkliste.verbinden(neu)).remove("uri_" + id).remove("name_" + id).apply(); }
            return new JSObject().put("vergessen", alt.size() - neu.size());
        });
    }

    /** Kinder eines Ordners in einer Abfrage; merkt sich Kennung und Art je Pfad für spätere Aufrufe. */
    private JSArray liste(Baum b, String p) throws IOException {
        String id = b.ids.get(p);
        if (id == null || !Boolean.TRUE.equals(b.istOrdner.get(p))) throw new IOException("PD_NICHT_GEFUNDEN");
        Uri kinder = DocumentsContract.buildChildDocumentsUriUsingTree(b.baum, id);
        String[] spalten = { DocumentsContract.Document.COLUMN_DOCUMENT_ID, DocumentsContract.Document.COLUMN_DISPLAY_NAME,
            DocumentsContract.Document.COLUMN_MIME_TYPE, DocumentsContract.Document.COLUMN_SIZE, DocumentsContract.Document.COLUMN_LAST_MODIFIED };
        JSArray aus = new JSArray();
        try (Cursor c = cr().query(kinder, spalten, null, null, null)) {
            if (c == null) throw new IOException("PD_ORDNER_NICHT_ERREICHBAR");
            while (c.moveToNext()) {
                String kid = c.getString(0), name = c.getString(1), mime = c.getString(2);
                if (kid == null || !NativeUtil.nameGueltig(name)) continue;
                boolean dir = DocumentsContract.Document.MIME_TYPE_DIR.equals(mime);
                long groesse = dir || c.isNull(3) ? 0 : c.getLong(3), geaendert = c.isNull(4) ? 0 : c.getLong(4);
                String voll = p.isEmpty() ? name : p + "/" + name;
                b.ids.put(voll, kid); b.istOrdner.put(voll, dir);
                aus.put(new JSObject().put("name", name).put("art", dir ? "ordner" : "datei").put("groesse", groesse).put("geaendert", geaendert));
            }
        } catch (SecurityException e) { throw new IOException("PD_FREIGABE_FEHLT"); }
        return aus;
    }
    /** Kennung eines Pfads; unbekannte Pfade werden Teil für Teil über die Ordnerlisten gesucht. */
    private String id(Baum b, String p) throws IOException {
        if (b.ids.containsKey(p)) return b.ids.get(p);
        int i = p.lastIndexOf('/');
        String eltern = i < 0 ? "" : p.substring(0, i);
        id(b, eltern); liste(b, eltern);
        String id = b.ids.get(p);
        if (id == null) throw new IOException("PD_NICHT_GEFUNDEN");
        return id;
    }

    @PluginMethod public void ordnerListe(PluginCall call) {
        arbeit(call, () -> { Baum b = baum(call); String p = pfad(call); id(b, p); return new JSObject().put("eintraege", liste(b, p)); });
    }
    @PluginMethod public void dateiInfo(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call); String p = pfad(call); id(b, p);
            boolean dir = Boolean.TRUE.equals(b.istOrdner.get(p));
            return new JSObject().put("art", dir ? "ordner" : "datei");
        });
    }
    @PluginMethod public void dateiLesen(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call); String p = pfad(call);
            String id = id(b, p);
            if (Boolean.TRUE.equals(b.istOrdner.get(p))) throw new IOException("PD_NICHT_GEFUNDEN");
            long von = Math.max(0, zahl(call, "offset", 0L));
            int laenge = (int) Math.min(NativeUtil.STUECK, Math.max(0, zahl(call, "laenge", 0L)));
            Uri doc = DocumentsContract.buildDocumentUriUsingTree(b.baum, id);
            byte[] aus;
            try (ParcelFileDescriptor pfd = cr().openFileDescriptor(doc, "r")) {
                if (pfd == null) throw new IOException("PD_NICHT_GEFUNDEN");
                try (FileInputStream in = new FileInputStream(pfd.getFileDescriptor())) {
                    FileChannel k = in.getChannel(); k.position(von);
                    ByteBuffer buf = ByteBuffer.allocate(laenge);
                    while (buf.hasRemaining()) { if (k.read(buf) < 0) break; }
                    aus = new byte[buf.position()]; buf.flip(); buf.get(aus);
                } catch (IOException kanalFehlt) {
                    // Manche Anbieter (Cloud) liefern keinen suchbaren Kanal: dann als Strom lesen und vorspulen.
                    aus = stromLesen(doc, von, laenge);
                }
            } catch (SecurityException e) { throw new IOException("PD_FREIGABE_FEHLT"); }
            return new JSObject().put("data", Base64.encodeToString(aus, Base64.NO_WRAP));
        });
    }
    private byte[] stromLesen(Uri doc, long von, int laenge) throws IOException {
        try (InputStream in = cr().openInputStream(doc)) {
            if (in == null) throw new IOException("PD_NICHT_GEFUNDEN");
            long rest = von; while (rest > 0) { long s = in.skip(rest); if (s <= 0) { if (in.read() < 0) break; s = 1; } rest -= s; }
            byte[] b = new byte[laenge]; int n = 0, r;
            while (n < laenge && (r = in.read(b, n, laenge - n)) > 0) n += r;
            return n == laenge ? b : java.util.Arrays.copyOf(b, n);
        }
    }

    @PluginMethod public void dateiBeginn(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call); String voll = call.getString("pfad", "");
            if (!NativeUtil.schreibPfadGueltig(voll)) throw new IOException("PD_NICHT_ERLAUBT");
            int i = voll.lastIndexOf('/');
            String eltern = i < 0 ? "" : voll.substring(0, i), name = voll.substring(i + 1);
            if (!eltern.isEmpty()) { id(b, eltern); if (!Boolean.TRUE.equals(b.istOrdner.get(eltern))) throw new IOException("PD_NICHT_GEFUNDEN"); }
            liste(b, eltern);
            String id = b.ids.get(voll);
            if (id != null && Boolean.TRUE.equals(b.istOrdner.get(voll))) throw new IOException("PD_NICHT_ERLAUBT");
            Uri doc = id != null ? DocumentsContract.buildDocumentUriUsingTree(b.baum, id)
                : DocumentsContract.createDocument(cr(), DocumentsContract.buildDocumentUriUsingTree(b.baum, b.ids.get(eltern)), "application/json", name);
            if (doc == null) throw new IOException("PD_SCHREIBEN_FEHLT");
            Schreiben s = new Schreiben(); s.baum = b; s.name = voll; s.sha = MessageDigest.getInstance("SHA-256");
            try { s.out = cr().openOutputStream(doc, "wt"); }
            // Ohne Kürzen („w“) blieben bei einer kürzeren Datei alte Bytes am Ende stehen – dann lieber nicht schreiben.
            catch (IllegalArgumentException | java.io.FileNotFoundException keinKuerzen) { throw new IOException("PD_SCHREIBEN_FEHLT"); }
            if (s.out == null) throw new IOException("PD_SCHREIBEN_FEHLT");
            String sid = UUID.randomUUID().toString(); offen.put(sid, s);
            return new JSObject().put("id", sid);
        });
    }

    // ---------- Große Ordner (0.4.3, Klaus 14.11.) ----------
    /** Fingerabdruck einer Datei am Ort, Stück für Stück – die Bytes gehen nie durch die Brücke (auch bei mehreren GB). */
    @PluginMethod public void pruefsumme(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call); String p = pfad(call); String id = id(b, p);
            if (Boolean.TRUE.equals(b.istOrdner.get(p))) throw new IOException("PD_NICHT_GEFUNDEN");
            MessageDigest sha = MessageDigest.getInstance("SHA-256"); long n = 0;
            try (InputStream in = cr().openInputStream(DocumentsContract.buildDocumentUriUsingTree(b.baum, id))) {
                if (in == null) throw new IOException("PD_NICHT_GEFUNDEN");
                byte[] buf = new byte[NativeUtil.STUECK]; int r;
                while ((r = in.read(buf)) > 0) { sha.update(buf, 0, r); n += r; }
            } catch (SecurityException e) { throw new IOException("PD_FREIGABE_FEHLT"); }
            return new JSObject().put("sha256", NativeUtil.hex(sha.digest())).put("groesse", n);
        });
    }
    /** Freier Speicher auf dem Laufwerk des Ordners (Androids Angabe zum Speicher); -1 = unbekannt (Anbieter sagt es nicht). */
    @PluginMethod public void speicherFrei(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call); long frei = -1;
            String wurzel = b.ids.get(""), vol = wurzel.contains(":") ? wurzel.substring(0, wurzel.indexOf(':') + 1) : wurzel;
            String[] spalten = { DocumentsContract.Root.COLUMN_DOCUMENT_ID, DocumentsContract.Root.COLUMN_AVAILABLE_BYTES };
            try (Cursor c = cr().query(DocumentsContract.buildRootsUri(b.baum.getAuthority()), spalten, null, null, null)) {
                while (c != null && c.moveToNext()) {
                    String rid = c.getString(0);
                    if (rid != null && (wurzel.startsWith(rid) || rid.startsWith(vol)) && !c.isNull(1)) { frei = c.getLong(1); break; }
                }
            } catch (Exception keineAngabe) { frei = -1; }
            return new JSObject().put("frei", frei);
        });
    }
    /** Arbeitsordner anlegen: im gewählten Laufwerk/Ordner entsteht „PseudoDoc-Arbeit“ (heißt der gewählte Ordner schon so, gilt er selbst).
     *  Nie im Pro-Tresor (Ordner mit tresorordner.json): der ist verschlüsselt und gehört dem Tresor-Paket. */
    @PluginMethod public void arbeitsordner(PluginCall call) {
        arbeit(call, () -> {
            Baum b = baum(call);
            JSArray kinder = liste(b, "");
            for (int i = 0; i < kinder.length(); i++) if ("tresorordner.json".equals(kinder.getJSONObject(i).getString("name"))) throw new IOException("PD_TRESOR_ORDNER");
            String wurzelName = b.ids.get(""); int k = wurzelName.lastIndexOf('/'); if (k >= 0) wurzelName = wurzelName.substring(k + 1);
            k = wurzelName.lastIndexOf(':'); if (k >= 0) wurzelName = wurzelName.substring(k + 1);
            if (NativeUtil.ARBEIT.equals(wurzelName)) return new JSObject().put("pfad", "").put("neu", false);
            String id = b.ids.get(NativeUtil.ARBEIT);
            if (id != null && !Boolean.TRUE.equals(b.istOrdner.get(NativeUtil.ARBEIT))) throw new IOException("PD_NICHT_ERLAUBT");
            boolean neu = id == null;
            if (neu) {
                Uri d = DocumentsContract.createDocument(cr(), DocumentsContract.buildDocumentUriUsingTree(b.baum, b.ids.get("")), DocumentsContract.Document.MIME_TYPE_DIR, NativeUtil.ARBEIT);
                if (d == null) throw new IOException("PD_SCHREIBEN_FEHLT");
                liste(b, "");
                if (!Boolean.TRUE.equals(b.istOrdner.get(NativeUtil.ARBEIT))) throw new IOException("PD_SCHREIBEN_FEHLT");
            }
            return new JSObject().put("pfad", NativeUtil.ARBEIT).put("neu", neu);
        });
    }
    @PluginMethod public void dateiAnhaengen(PluginCall call) {
        arbeit(call, () -> {
            Schreiben s = offen.get(call.getString("id", ""));
            if (s == null || zahl(call, "offset", -1L) != s.groesse) throw new IOException("PD_STUECK_UNGUELTIG");
            String data = call.getString("data", "");
            if (data.length() > ((NativeUtil.STUECK + 2) / 3) * 4) throw new IOException("PD_STUECK_UNGUELTIG");
            byte[] b = Base64.decode(data, Base64.NO_WRAP);
            if (s.groesse + b.length > NativeUtil.MAX_SCHREIBEN) throw new IOException("PD_AUSGABE_ZU_GROSS");
            s.out.write(b); s.sha.update(b); s.groesse += b.length;
            return new JSObject().put("size", s.groesse);
        });
    }
    @PluginMethod public void dateiFertig(PluginCall call) {
        arbeit(call, () -> {
            String id = call.getString("id", ""); Schreiben s = offen.remove(id);
            if (s == null) throw new IOException("PD_STUECK_UNGUELTIG");
            s.out.flush(); s.out.close();
            if (zahl(call, "size", -1L) != s.groesse) throw new IOException("PD_STUECK_UNGUELTIG");
            return new JSObject().put("size", s.groesse).put("sha256", NativeUtil.hex(s.sha.digest()));
        });
    }

    @Override protected void handleOnDestroy() {
        worker.close(() -> {
            for (Schreiben s : offen.values()) { try { s.out.close(); } catch (Exception egal) { /* weiter */ } }
            offen.clear(); ordner.clear();
        });
    }
}
