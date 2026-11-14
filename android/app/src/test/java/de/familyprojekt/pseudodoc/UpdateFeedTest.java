package de.familyprojekt.pseudodoc;

import static org.junit.Assert.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.Test;

/** Updates vom eigenen Server: Unterschriften wie aus dem Veröffentlichungs-Lauf (openssl pkeyutl -sign -rawin, Base64), erzeugt mit
 *  Wegwerf-Schlüsseln nur für diese Probe (nicht Klaus' Schlüssel; dessen öffentlicher Teil steht in UpdateFeed.SCHLUESSEL). */
public class UpdateFeedTest {
    static final String PUB = "MCowBQYDK2VwAyEA6645RpjrlMSpVlNikh41DF25EL/qbKhySobmrCppygA=";
    static final String SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static byte[] feed(String app, String datei, int code) {
        return ("{\"format\":1,\"app\":\"" + app + "\",\"version\":\"0.4.1\",\"android\":{\"datei\":\"" + datei + "\",\"groesse\":1234,\"sha256\":\"" + SHA + "\",\"versionCode\":" + code + "}}").getBytes(StandardCharsets.UTF_8);
    }
    static final byte[] NEU = feed("pseudodoc", "PseudoDoc-Pro-0.4.1.apk", 41), BOESE = feed("pseudodoc", "../evil.apk", 41),
        CODE = feed("pseudodoc", "PseudoDoc-Pro-0.4.1.apk", 40), FREMDAPP = feed("bookledgerpro", "PseudoDoc-Pro-0.4.1.apk", 41);
    static final byte[] NEU_SIG = "tO2CjnYDHR6QXAujLq03W78yw2sRPlxTCpBEbngJ7jXPpXXtSRXH6bWaxk8TERa+yLkToaxwyo1lixuOyzr+Cg==\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] BOESE_SIG = "22SphXs7hqkDJwy2OpoZll07ACkO4kXqXiQroRyvXaEqXkehuOxt72xg/ZMYOK+nr00RsMNqLCO4nnGwWwSiAw==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] CODE_SIG = "DUz15XsLW/vGfqv+MlEX1/mCwiWTTfU0ZZoc8tvEReHPBDNS4egbAUuAZTfWzKpxzjZ1cNpUxXHG0RXmfqjIAw==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMDAPP_SIG = "BY24SzjtEEoBu2PB7qzbtVWPHAKA00tnky/bum5N4nHqFLmbJGm8GrLv9p/UpoyXix+lFLMkfLifE2FunxBNCQ==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMD_SIG = "sI3PaawMMwUrCyvZHOCZZdx28f92UI1pGNH6yB+s9lBBemm4nq/OxYPqCzPgIqoSFF4EZFczAxz6MYY3BR6cBw==".getBytes(StandardCharsets.US_ASCII);
    static String fehler(byte[] f, byte[] s, String v, long c, String k) {
        try { UpdateFeed.auswerten(f, s, v, c, k); return ""; } catch (IOException e) { return e.getMessage(); }
    }

    @Test public void neuereVersionMitEchterUnterschrift() throws Exception {
        UpdateFeed.Angebot a = UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.0", 40, PUB);
        assertNotNull(a);
        assertEquals("0.4.1", a.version); assertEquals("PseudoDoc-Pro-0.4.1.apk", a.datei); assertEquals(1234, a.groesse); assertEquals(41, a.versionCode);
    }
    @Test public void debugZusatzWirdIgnoriert() throws Exception { assertNotNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.0-debug", 40, PUB)); }
    @Test public void gleicheOderAeltereVersionIstAktuell() throws Exception {
        assertNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.4.1", 41, PUB));
        assertNull(UpdateFeed.auswerten(NEU, NEU_SIG, "0.5.0", 50, PUB));
    }
    @Test public void versionCodeMussSteigen() throws Exception { assertNull(UpdateFeed.auswerten(CODE, CODE_SIG, "0.4.0", 40, PUB)); }
    @Test public void fremdeUnterschrift() { assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(NEU, FREMD_SIG, "0.4.0", 40, PUB)); }
    @Test public void veraenderteAngaben() {
        byte[] f = NEU.clone(); f[f.length - 3] = '9';
        assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(f, NEU_SIG, "0.4.0", 40, PUB));
    }
    @Test public void kaputteUnterschrift() { assertEquals("UPDATE_UNTERSCHRIFT_FALSCH", fehler(NEU, "@@@".getBytes(), "0.4.0", 40, PUB)); }
    @Test public void fremderDateinameAuchUnterschrieben() { assertEquals("UPDATE_UNGUELTIG", fehler(BOESE, BOESE_SIG, "0.4.0", 40, PUB)); }
    @Test public void feedEinerAnderenAppAuchUnterschrieben() { assertEquals("UPDATE_UNGUELTIG", fehler(FREMDAPP, FREMDAPP_SIG, "0.4.0", 40, PUB)); }
    @Test public void ohneSchluesselNichtEingerichtet() {
        assertEquals("UPDATE_NICHT_EINGERICHTET", fehler(NEU, NEU_SIG, "0.4.0", 40, ""));
        assertEquals("UPDATE_NICHT_EINGERICHTET", fehler(NEU, NEU_SIG, "0.4.0", 40, "kein-schluessel"));
        assertFalse(UpdateFeed.echt(NEU, UpdateFeed.b64(new String(NEU_SIG, StandardCharsets.US_ASCII)), ""));
    }
    @Test public void eingebauterSchluesselLeerOderGueltig() {
        // Platzhalter bis Klaus den Schlüssel erzeugt: leer heißt „nicht eingerichtet“; ein eingetragener muss gültig sein.
        assertTrue(UpdateFeed.SCHLUESSEL.isEmpty() || UpdateFeed.eingerichtet(UpdateFeed.SCHLUESSEL));
        assertTrue(UpdateFeed.eingerichtet(PUB));
    }
    @Test public void base64() {
        assertArrayEquals("ab".getBytes(), UpdateFeed.b64("YWI="));
        assertArrayEquals("abc".getBytes(), UpdateFeed.b64("YWJj"));
        assertArrayEquals("abcd".getBytes(), UpdateFeed.b64("YWJjZA"));
    }
    @Test public void versionsvergleich() {
        assertTrue(UpdateFeed.neuer("0.10.0", "0.9.9")); assertFalse(UpdateFeed.neuer("0.4.0", "0.4.0")); assertFalse(UpdateFeed.neuer("1.0.0-x", "0.1.0"));
        assertEquals("PseudoDoc-Pro-0.4.0.apk", UpdateFeed.dateiName("0.4.0"));
    }
}
