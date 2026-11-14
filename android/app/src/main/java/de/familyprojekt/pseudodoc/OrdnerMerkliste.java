package de.familyprojekt.pseudodoc;

import java.util.ArrayList;
import java.util.List;

/** Reihenfolge der gemerkten Ordner (dauerhafte Freigabe, höchstens 5, neueste zuerst). Rein, in JVM-Proben geprüft. */
final class OrdnerMerkliste {
    static final int MAX = 5;
    private OrdnerMerkliste() { }
    /** Neue Reihenfolge, wenn id gewählt wurde: id nach vorn, keine Doppelten, höchstens MAX. */
    static List<String> vorn(List<String> alt, String id) {
        List<String> neu = new ArrayList<>(); neu.add(id);
        for (String a : alt) if (neu.size() < MAX && a != null && !a.isEmpty() && !a.equals(id)) neu.add(a);
        return neu;
    }
    /** Was aus der alten Liste herausfällt (deren Freigabe gibt die App an Android zurück). */
    static List<String> heraus(List<String> alt, List<String> neu) {
        List<String> weg = new ArrayList<>(); for (String a : alt) if (!neu.contains(a)) weg.add(a); return weg;
    }
    static String verbinden(List<String> ids) { return String.join(",", ids); }
    static List<String> trennen(String text) {
        List<String> aus = new ArrayList<>();
        if (text != null) for (String t : text.split(",")) if (t.matches("[0-9a-f-]{36}")) aus.add(t);
        return aus;
    }
}
