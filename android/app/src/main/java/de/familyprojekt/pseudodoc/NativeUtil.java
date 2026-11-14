package de.familyprojekt.pseudodoc;

import java.util.Locale;

/** Kleine Helfer der Hülle. Rein, ohne Android, in JVM-Proben geprüft (NativeUtilTest). */
final class NativeUtil {
    /** Lesestück für die Brücke (1 MiB, wie im Ordnerweg der Familienakte und in src/quellen.ts STUECK). */
    static final int STUECK = 1024 * 1024;
    /** Größte Datei, die die Seite über die Brücke schreiben darf (organizer-index.json mit Text). */
    static final long MAX_SCHREIBEN = 64L * 1024 * 1024;
    private NativeUtil() { }

    static String hex(byte[] value) {
        StringBuilder out = new StringBuilder(value.length * 2);
        for (byte b : value) out.append(String.format(Locale.ROOT, "%02x", b & 255));
        return out.toString();
    }

    /**
     * Zahl aus einem Brücken-Aufruf. Nie Capacitors getLong für kleine Zahlen: die kommen aus dem JSON als Integer an, getLong
     * gibt dann den Ersatzwert zurück (Familienakte, Gerätetest 11.11.2026: „Größe -1 statt 0“). Darum jede Zahl annehmen.
     */
    static long zahl(Object wert, long ersatz) {
        if (!(wert instanceof Number)) return ersatz;
        double d = ((Number) wert).doubleValue();
        if (!Double.isFinite(d) || d != Math.rint(d)) return ersatz;
        return ((Number) wert).longValue();
    }

    /** Relativer Pfad im gewählten Ordner: Teile mit „/“, keine leeren Teile, kein „.“/„..“, keine Steuerzeichen. "" = Wurzel. */
    static boolean pfadGueltig(String pfad) {
        if (pfad == null) return false;
        if (pfad.isEmpty()) return true;
        if (pfad.length() > 4096) return false;
        for (String teil : pfad.split("/", -1)) if (!nameGueltig(teil)) return false;
        return true;
    }
    static boolean nameGueltig(String name) {
        return name != null && !name.isEmpty() && name.length() <= 255 && !name.equals(".") && !name.equals("..")
            && !name.contains("/") && !name.contains("\\") && !name.matches(".*\\p{Cntrl}.*");
    }
    /** Schreiben ist nur für eine Datei direkt im gewählten Ordner erlaubt (organizer-index.json), nie in Unterordnern. */
    static boolean schreibNameGueltig(String name) {
        return nameGueltig(name) && name.endsWith(".json") && !name.startsWith(".");
    }

    /** Arbeitsordner (Klaus 14.11.: „nur das Laufwerk wählen, der richtige Ordner entsteht von selbst“). Gleich in DesktopOrdner und src/arbeit.ts. */
    static final String ARBEIT = "PseudoDoc-Arbeit";
    /** Schreiben: eine .json direkt im Ordner (organizer-index.json) oder eine .json direkt im Arbeitsordner – sonst nichts, nie tiefer. */
    static boolean schreibPfadGueltig(String pfad) {
        if (schreibNameGueltig(pfad)) return true;
        return pfad != null && pfad.startsWith(ARBEIT + "/") && schreibNameGueltig(pfad.substring(ARBEIT.length() + 1));
    }

    /** Klaus' eigene Apps unter lausiklauskn-png.github.io dürfen auch ohne Tipp im Browser geöffnet werden. */
    static boolean eigeneAdresse(String scheme, String host) {
        return "https".equals(scheme) && "lausiklauskn-png.github.io".equals(host);
    }
}
