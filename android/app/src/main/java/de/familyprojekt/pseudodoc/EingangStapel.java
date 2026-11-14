package de.familyprojekt.pseudodoc;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.RandomAccessFile;
import java.util.*;

/**
 * Eingang für „Teilen an die App“ und „Öffnen mit“, rein und ohne Android – in JVM-Proben geprüft (EingangStapelTest). Gleiche Bauweise
 * wie unter Windows (windows/engine/…/DesktopEingang.java): die geteilten Dateien werden als KOPIE in einen Stapel im App-Speicher
 * gelegt (Originale bleiben, wo sie sind), die Seite holt einen Stapel ab und liest ihn in Stücken. Abgeholte Stapel bleiben 14 Tage
 * lesbar (Ansehen), halbe Stapel nach einem Absturz verschwinden beim nächsten Start. java.io statt java.nio.file (läuft ab Android 7).
 */
final class EingangStapel {
    static final int MAX_DATEIEN = 500;
    static final long MAX_DATEI = 512L * 1024 * 1024, MAX_STAPEL = 2L * 1024 * 1024 * 1024, AUFHEBEN = 14L * 24 * 3600 * 1000;
    static final String STAPEL = "\\d+-[0-9a-f]{8}";
    interface Quelle { String name(); InputStream oeffnen() throws IOException; }
    static final class Datei { final String name; final long groesse, geaendert; Datei(String n, long g, long z) { name = n; groesse = g; geaendert = z; } }
    static final class Abgeholt { final String stapel; final List<Datei> dateien; final int weitere; Abgeholt(String s, List<Datei> d, int w) { stapel = s; dateien = d; weitere = w; } }
    private final File ordner;

    EingangStapel(File ordner) throws IOException { this.ordner = ordner; if (!ordner.isDirectory() && !ordner.mkdirs()) throw new IOException("PD_EINGANG_FEHLT"); }

    /** Name ohne Pfad, ohne Steuer- und Sonderzeichen. */
    static String name(String roh) {
        String n = roh == null ? "" : roh;
        int i = Math.max(n.lastIndexOf('/'), n.lastIndexOf('\\')); if (i >= 0) n = n.substring(i + 1);
        n = n.replaceAll("[\\p{Cntrl}:*?\"<>|]", "_").trim();
        while (n.startsWith(".")) n = n.substring(1);
        if (n.isEmpty()) n = "Datei";
        return n.length() > 180 ? n.substring(0, 180) : n;
    }

    /** Kopiert die Quellen in einen neuen Stapel; gibt die Zahl der übernommenen Dateien zurück. Unlesbares und Übergroßes wird übergangen. */
    synchronized int aufnehmen(List<Quelle> quellen, long jetzt) throws IOException {
        String stapel = jetzt + "-" + UUID.randomUUID().toString().substring(0, 8);
        File teil = new File(ordner, stapel + ".teil");
        if (!teil.mkdirs()) throw new IOException("PD_EINGANG_FEHLT");
        Set<String> namen = new HashSet<>(); int n = 0; long summe = 0;
        for (Quelle q : quellen) {
            if (n >= MAX_DATEIEN) break;
            String nm = name(q.name()), stamm = nm;
            for (int k = 2; !namen.add(nm.toLowerCase(Locale.ROOT)); k++) { int dot = stamm.lastIndexOf('.'); nm = dot > 0 ? stamm.substring(0, dot) + " (" + k + ")" + stamm.substring(dot) : stamm + " (" + k + ")"; }
            File ziel = new File(teil, nm); long g = 0; boolean gut = true;
            try (InputStream in = q.oeffnen(); OutputStream out = new FileOutputStream(ziel)) {
                if (in == null) throw new IOException("leer");
                byte[] b = new byte[65536]; int r;
                while ((r = in.read(b)) != -1) { g += r; if (g > MAX_DATEI || summe + g > MAX_STAPEL) { gut = false; break; } out.write(b, 0, r); }
            } catch (IOException | SecurityException unlesbar) { gut = false; }
            if (gut) { n++; summe += g; } else { ziel.delete(); namen.remove(nm.toLowerCase(Locale.ROOT)); }
        }
        if (n == 0) { loeschen(teil); return 0; }
        if (!teil.renameTo(new File(ordner, stapel))) { loeschen(teil); throw new IOException("PD_EINGANG_FEHLT"); }
        return n;
    }

    /** Ältesten noch nicht abgeholten Stapel abgeben (oder null). */
    synchronized Abgeholt abholen() throws IOException {
        List<File> offen = new ArrayList<>();
        File[] alle = ordner.listFiles();
        if (alle != null) for (File p : alle) if (p.getName().matches(STAPEL) && p.isDirectory()) offen.add(p);
        if (offen.isEmpty()) return null;
        Collections.sort(offen, (a, b) -> a.getName().compareTo(b.getName()));
        File neu = new File(ordner, offen.get(0).getName() + ".abgeholt");
        if (!offen.get(0).renameTo(neu)) throw new IOException("PD_EINGANG_FEHLT");
        List<Datei> d = new ArrayList<>();
        File[] inhalt = neu.listFiles();
        if (inhalt != null) for (File p : inhalt) if (p.isFile()) d.add(new Datei(p.getName(), p.length(), p.lastModified()));
        Collections.sort(d, (a, b) -> a.name.compareTo(b.name));
        return new Abgeholt(neu.getName(), d, offen.size() - 1);
    }

    synchronized byte[] lesen(String stapel, String name, long von, int laenge) throws IOException {
        if (stapel == null || !stapel.matches(STAPEL + "\\.abgeholt") || !NativeUtil.nameGueltig(name)) throw new IOException("PD_NICHT_GEFUNDEN");
        File f = new File(new File(ordner, stapel), name);
        if (!f.isFile() || !f.getCanonicalFile().getParentFile().equals(new File(ordner, stapel).getCanonicalFile())) throw new IOException("PD_NICHT_GEFUNDEN");
        try (RandomAccessFile r = new RandomAccessFile(f, "r")) {
            long start = Math.max(0, von); if (start >= r.length()) return new byte[0];
            byte[] b = new byte[(int) Math.min(Math.max(0, Math.min(NativeUtil.STUECK, laenge)), r.length() - start)];
            r.seek(start); r.readFully(b); return b;
        }
    }

    void aufraeumen(long jetzt) {
        File[] alle = ordner.listFiles(); if (alle == null) return;
        for (File p : alle) {
            String n = p.getName();
            if (!n.matches(STAPEL + "(\\.abgeholt|\\.teil)")) continue;
            long zeit = Long.parseLong(n.substring(0, n.indexOf('-')));
            if (n.endsWith(".teil") || jetzt - zeit > AUFHEBEN) loeschen(p);
        }
    }
    private static void loeschen(File p) {
        File[] k = p.listFiles(); if (k != null) for (File x : k) loeschen(x);
        p.delete();
    }
}
