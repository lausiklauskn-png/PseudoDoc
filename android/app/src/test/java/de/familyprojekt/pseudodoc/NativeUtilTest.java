package de.familyprojekt.pseudodoc;

import static org.junit.Assert.*;

import org.junit.Test;

public class NativeUtilTest {
    @Test public void zahlNimmtAuchInteger() {
        // Familienakte, Gerätetest 11.11.2026: kleine Zahlen kommen als Integer – getLong gab den Ersatzwert.
        assertEquals(0L, NativeUtil.zahl(Integer.valueOf(0), -1));
        assertEquals(1048576L, NativeUtil.zahl(Integer.valueOf(1048576), -1));
        assertEquals(5000000000L, NativeUtil.zahl(Long.valueOf(5000000000L), -1));
        assertEquals(7L, NativeUtil.zahl(Double.valueOf(7.0), -1));
        assertEquals(-1L, NativeUtil.zahl(Double.valueOf(7.5), -1));
        assertEquals(-1L, NativeUtil.zahl("7", -1));
        assertEquals(-1L, NativeUtil.zahl(null, -1));
    }
    @Test public void pfade() {
        assertTrue(NativeUtil.pfadGueltig(""));
        assertTrue(NativeUtil.pfadGueltig("Eingang/2026/Brief.pdf"));
        for (String p : new String[] { null, "/a", "a/", "a//b", "../a", "a/../b", "./a", "a\\b", "a\u0000b" }) assertFalse(p, NativeUtil.pfadGueltig(p));
    }
    @Test public void schreibenNurJsonDirektImOrdner() {
        assertTrue(NativeUtil.schreibNameGueltig("organizer-index.json"));
        assertFalse(NativeUtil.schreibNameGueltig("Unter/organizer-index.json"));
        assertFalse(NativeUtil.schreibNameGueltig("Brief.pdf"));
        assertFalse(NativeUtil.schreibNameGueltig(".json"));
        assertFalse(NativeUtil.schreibNameGueltig(".."));
    }
    @Test public void schreibenAuchDirektImArbeitsordner() {
        assertTrue(NativeUtil.schreibPfadGueltig("organizer-index.json"));
        assertTrue(NativeUtil.schreibPfadGueltig("PseudoDoc-Arbeit/stand.json"));
        for (String p : new String[] { null, "PseudoDoc-Arbeit/Unter/stand.json", "Anderer/stand.json", "PseudoDoc-Arbeit/Brief.pdf",
            "PseudoDoc-Arbeit/", "PseudoDoc-Arbeit/../x.json", "PseudoDoc-Arbeit/.json", "PseudoDoc-Arbeitx/stand.json" })
            assertFalse(p, NativeUtil.schreibPfadGueltig(p));
    }
    @Test public void hexUndAdressen() {
        assertEquals("00ff10", NativeUtil.hex(new byte[] { 0, (byte) 255, 16 }));
        assertTrue(NativeUtil.eigeneAdresse("https", "lausiklauskn-png.github.io"));
        assertFalse(NativeUtil.eigeneAdresse("http", "lausiklauskn-png.github.io"));
        assertFalse(NativeUtil.eigeneAdresse("https", "example.com"));
    }
}
