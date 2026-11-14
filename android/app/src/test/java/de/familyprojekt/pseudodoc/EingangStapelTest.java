package de.familyprojekt.pseudodoc;

import static org.junit.Assert.*;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import org.junit.Test;

/** Teilen an die App / „Öffnen mit“: Kopie in Stapel, abholen, in Stücken lesen, aufräumen (EingangStapel). */
public class EingangStapelTest {
    static EingangStapel.Quelle q(String name, byte[] b) {
        return new EingangStapel.Quelle() { public String name() { return name; } public InputStream oeffnen() { return new ByteArrayInputStream(b); } };
    }
    static EingangStapel.Quelle kaputt(String name) {
        return new EingangStapel.Quelle() { public String name() { return name; } public InputStream oeffnen() throws IOException { throw new SecurityException("keine Freigabe"); } };
    }
    static File tmp() throws IOException { return Files.createTempDirectory("do-eingang-").toFile(); }

    @Test public void kopieAbholenLesen() throws Exception {
        File ordner = tmp(); EingangStapel s = new EingangStapel(ordner);
        assertNull("leer → nichts", s.abholen());
        byte[] gross = new byte[2_500_000]; new Random(7).nextBytes(gross);
        assertEquals(2, s.aufnehmen(Arrays.asList(q("Auszug-0326.pdf", gross), kaputt("weg.pdf"), q("../../brief.txt", "Hallo".getBytes("UTF-8"))), 1000));
        assertEquals(1, s.aufnehmen(Arrays.asList(q("später.txt", new byte[] { 1 })), 2000));
        EingangStapel.Abgeholt a = s.abholen();
        assertNotNull(a); assertEquals(2, a.dateien.size()); assertEquals(1, a.weitere);
        assertEquals("Auszug-0326.pdf", a.dateien.get(0).name); assertEquals("brief.txt", a.dateien.get(1).name);
        java.io.ByteArrayOutputStream zus = new java.io.ByteArrayOutputStream();
        for (long off = 0; off < gross.length; off += NativeUtil.STUECK) zus.write(s.lesen(a.stapel, "Auszug-0326.pdf", off, NativeUtil.STUECK));
        assertArrayEquals("in Stücken gelesen = Original", gross, zus.toByteArray());
        assertEquals("höchstens 1 MiB", NativeUtil.STUECK, s.lesen(a.stapel, "Auszug-0326.pdf", 0, 9_000_000).length);
        assertEquals("hinter dem Ende leer", 0, s.lesen(a.stapel, "brief.txt", 99, 10).length);
        assertEquals(1, s.abholen().dateien.size());
        assertNull("beide abgeholt", s.abholen());
        assertEquals("abgeholt bleibt lesbar", 5, s.lesen(a.stapel, "brief.txt", 0, 10).length);
    }

    @Test public void keinAusbruch() throws Exception {
        File ordner = tmp(); EingangStapel s = new EingangStapel(ordner);
        s.aufnehmen(Arrays.asList(q("a.txt", new byte[] { 1 })), 1000);
        EingangStapel.Abgeholt a = s.abholen();
        for (String[] f : new String[][] { { a.stapel, ".." }, { a.stapel, "x/../a.txt" }, { "../x", "a.txt" }, { "1000-zzzzzzzz.abgeholt", "a.txt" }, { a.stapel.replace(".abgeholt", ""), "a.txt" } }) {
            try { s.lesen(f[0], f[1], 0, 1); fail("gelesen: " + f[0] + " / " + f[1]); } catch (IOException e) { assertEquals("PD_NICHT_GEFUNDEN", e.getMessage()); }
        }
    }

    @Test public void namenUndDoppelte() throws Exception {
        assertEquals("brief.txt", EingangStapel.name("/sdcard/Download/brief.txt"));
        assertEquals("a_b_.pdf", EingangStapel.name("a:b?.pdf"));
        assertEquals("versteckt", EingangStapel.name(".versteckt"));
        assertEquals("Datei", EingangStapel.name(""));
        File ordner = tmp(); EingangStapel s = new EingangStapel(ordner);
        assertEquals(3, s.aufnehmen(Arrays.asList(q("Rechnung.pdf", new byte[] { 1 }), q("rechnung.pdf", new byte[] { 2 }), q("Rechnung.pdf", new byte[] { 3 })), 1000));
        List<String> namen = new ArrayList<>(); for (EingangStapel.Datei d : s.abholen().dateien) namen.add(d.name);
        assertEquals("Groß/klein gilt als gleich, die Nummer hängt am Namen", Arrays.asList("Rechnung (3).pdf", "Rechnung.pdf", "rechnung (2).pdf"), namen);
    }

    @Test public void nichtsLesbarKeinStapel() throws Exception {
        File ordner = tmp(); EingangStapel s = new EingangStapel(ordner);
        assertEquals(0, s.aufnehmen(Arrays.asList(kaputt("a.pdf")), 1000));
        assertNull(s.abholen());
        assertEquals("keine halben Stapel", 0, ordner.listFiles().length);
    }

    @Test public void aufraeumen() throws Exception {
        File ordner = tmp(); EingangStapel s = new EingangStapel(ordner);
        s.aufnehmen(Arrays.asList(q("a.txt", new byte[] { 1 })), 1000);
        EingangStapel.Abgeholt a = s.abholen();
        s.aufnehmen(Arrays.asList(q("b.txt", new byte[] { 1 })), 2000);
        assertTrue(new File(ordner, "3000-0000aaaa.teil").mkdirs());
        s.aufraeumen(1000 + EingangStapel.AUFHEBEN - 1);
        assertTrue("noch keine 14 Tage", new File(ordner, a.stapel).isDirectory());
        assertFalse("halber Stapel weg", new File(ordner, "3000-0000aaaa.teil").exists());
        s.aufraeumen(1000 + EingangStapel.AUFHEBEN + 1);
        assertFalse("abgeholt nach 14 Tagen weg", new File(ordner, a.stapel).exists());
        assertNotNull("nicht abgeholt bleibt", s.abholen());
    }

    @Test public void merkliste() {
        String a = "11111111-1111-1111-1111-111111111111", b = "22222222-2222-2222-2222-222222222222";
        List<String> l = OrdnerMerkliste.vorn(new ArrayList<>(), a);
        l = OrdnerMerkliste.vorn(l, b);
        assertEquals(Arrays.asList(b, a), l);
        assertEquals("wieder gewählt → nach vorn, nicht doppelt", Arrays.asList(a, b), OrdnerMerkliste.vorn(l, a));
        List<String> viele = new ArrayList<>();
        for (int i = 0; i < 7; i++) viele = OrdnerMerkliste.vorn(viele, String.format("%08d-0000-0000-0000-000000000000", i));
        assertEquals(OrdnerMerkliste.MAX, viele.size());
        assertEquals("00000006-0000-0000-0000-000000000000", viele.get(0));
        List<String> vorher = new ArrayList<>(viele), nachher = OrdnerMerkliste.vorn(vorher, b);
        assertEquals(Arrays.asList("00000002-0000-0000-0000-000000000000"), OrdnerMerkliste.heraus(vorher, nachher));
        assertEquals(nachher, OrdnerMerkliste.trennen(OrdnerMerkliste.verbinden(nachher)));
        assertEquals("Fremdes wird nicht gelesen", Arrays.asList(a), OrdnerMerkliste.trennen(a + ",../x,,content://y"));
    }
}
