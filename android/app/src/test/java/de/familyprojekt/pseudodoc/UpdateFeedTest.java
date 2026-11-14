package de.familyprojekt.pseudodoc;

import static org.junit.Assert.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import org.junit.Test;

/** Updates vom eigenen Server: Unterschriften wie aus dem Veröffentlichungs-Lauf (openssl pkeyutl -sign -rawin, Base64), erzeugt mit
 *  Wegwerf-Schlüsseln nur für diese Probe (nicht Klaus' Schlüssel; dessen öffentlicher Teil steht in UpdateFeed.SCHLUESSEL). */
public class UpdateFeedTest {
    static final String PUB = "MCowBQYDK2VwAyEAVY8XVabKgX65GcFBxMd10cBIJwd9Bai8Ky4WGpA+HXs=";
    static final String SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static byte[] feed(String app, String datei, int code) {
        return ("{\"format\":1,\"app\":\"" + app + "\",\"version\":\"0.4.1\",\"android\":{\"datei\":\"" + datei + "\",\"groesse\":1234,\"sha256\":\"" + SHA + "\",\"versionCode\":" + code + "}}").getBytes(StandardCharsets.UTF_8);
    }
    static final byte[] NEU = feed("pseudodoc", "PseudoDoc-Pro-0.4.1.apk", 41), BOESE = feed("pseudodoc", "../evil.apk", 41),
        CODE = feed("pseudodoc", "PseudoDoc-Pro-0.4.1.apk", 40), FREMDAPP = feed("bookledgerpro", "PseudoDoc-Pro-0.4.1.apk", 41);
    static final byte[] NEU_SIG = "fSNwiO5E78ZBcUKR+LrUIVxr2eDnq80hgJkvjK2OD623fDknVwqg5tIHuyQ3qXerRtNpLWwv5AgAzv2L+AfhAA==\n".getBytes(StandardCharsets.US_ASCII);
    static final byte[] BOESE_SIG = "U0GUEFsVBy2ch5h2ipNsQxMFQc2nHMHNAEZUJCrIf7v0DCIxKr90yCmuFdsYyePPwlmnkVi412BJKxGZvzkcBg==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] CODE_SIG = "SEAnYlx6ME4eAmJQxDhS+o8QXqg2HB0Luz58VTymcBqAYlInYga1QNPWIjA/Clm+iviCecb8z+I1d3p5SHfYDw==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMDAPP_SIG = "nOT0unV3Zc2vYDuJHoZyanByT6AfskA5srCZrq5aVt+J5cELd6Q5nhIcfPbqFTfQ2RdvJTQE7+l5EvDlzVziDQ==".getBytes(StandardCharsets.US_ASCII);
    static final byte[] FREMD_SIG = "UDt1CrAC1Xh7lohlgcVuv5cw2c8zm9ILHP1ApsfPvM0DekyEaBx5R1DOBiSR5JirUNS4M8CsOpU2pMHcAhZPCA==".getBytes(StandardCharsets.US_ASCII);
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
