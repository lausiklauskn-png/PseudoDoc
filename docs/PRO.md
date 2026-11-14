# PseudoDoc Pro – Android und Windows

Klaus 14.11.2026: „aus der PseudoDoc eine APK-App machen und eine Windows-App. Die nennst du dann PseudoDoc Pro und machst bitte die Maske
als Icon … blau, mit leichtem Verlauf … die Maske mit einem 3D-Schatten.“ · „Installationsbutton … verschwindet nach der Installation.
Versionsnummer = Update-Tool mit dem Fähnchen … lädt automatisch das Update … wie in Familienakte und den anderen.“

Muster und Code: Datei-Organizer Pro (dort gebaut und am 14.11. veröffentlicht), umbenannt. Namen: Web-App **PseudoDoc Basic**, App
**PseudoDoc Pro** (`src/nativ.ts`, `APP_VARIANTE`). Kennung `de.familyprojekt.pseudodoc` (Android und Windows), Fassung 0.1.0 (Android
`versionCode` 10 = Haupt×1000 + Neben×10 + Flick).

## Aufbau

| Teil | Wo |
|---|---|
| Web-Paket | `tools/native/prepare-web.mjs`: gebauter Stand `app/` byte-gleich, ohne `sw.js` → `www/` (Android) bzw. `windows/dist` (Windows) |
| Android | `android/` (Capacitor 8): `DoOrdnerPlugin` (FamilyFolders), `DoDateienPlugin` (Speichern unter …), `DoEingangPlugin` (Teilen an PseudoDoc Pro, „Öffnen mit“), `DoUpdatesPlugin` + `UpdateFeed` (Updates vom eigenen Server). Rechte nur INTERNET und REQUEST_INSTALL_PACKAGES, keine Android-Sicherung des App-Speichers |
| Windows | `windows/` (Tauri 2 + Java-Engine, mitgelieferte Java-Laufzeit, NSIS-Installer, „Öffnen mit“ nur für diesen Benutzer); Brücke `windows/bridge/` mit denselben Verträgen wie Android (`contracts.json`) |
| Symbole | `src/maske.ts` (Maske, 3D-Schatten) → `node scripts/logo.mjs`: Android-Launcher (eckig, rund, adaptiver Vordergrund, Hintergrund-Verlauf `drawable/ic_launcher_background.xml`), Startbilder, `src/public/pseudodoc-pro-256.png` (Windows-ICO). Die Web-App behält das Blatt mit Lichtstreifen |
| In der App | Kopf: Fassung = Update-Knopf, Fähnchen „Update x.y.z“ bei neuer Fassung (`src/kopf.tsx`); Pro fragt still `family-projekt.de/updates/pseudodoc/` (beim Start, beim Zurückholen, höchstens stündlich), Tipp lädt, prüft (Größe, SHA-256, Paket, Zertifikat, Unterschrift) und öffnet das Installieren-Fenster. Web-App: `version.json` neben der Seite, Tipp lädt neu. **Installieren**-Knopf nur in der Web-App, weg nach der Installation. Geteilte/„Öffnen mit“-Dateien kommen von selbst in „1 · Zur KI“ (`src/eingang.ts`) |

## Proben

- `npm run build` · `node tests/ui-probe.mjs` (Web, 52 grün; auch Installieren-Knopf und Fähnchen) · `node tools/native/test-native.mjs`
  (Hülle ohne Android: Paket, Kennungen, Fassungen, Rechte, Verträge, Feed, App startet aus dem Paket und pseudonymisiert das Beispiel; 67 grün)
- `node windows/engine/test.mjs` (64 grün, unter Linux mit `LANG=C.UTF-8`) · `node windows/engine/protocol-test.mjs`
- CI: `android.yml` (Gradle: Bau, Lint, JVM-Proben), `windows.yml` (Prüfbau installieren, zweimal starten – Beispiel, Ordner-Brücke,
  Speichern unter, „Öffnen mit“, Auftrag nach Neustart –, deinstallieren; Auslieferungsbau)
- Veröffentlichen prüft im Emulator: Beispiel pseudonymisieren, Auftrag gemerkt, überinstallieren, Auftrag noch da (`verify-signed-install.py`).

## Was Klaus einmalig tun muss

Nichts davon kann Claude tun; nichts wird ohne Klaus' Wort ausgelöst oder veröffentlicht.

**(a) Eigene Signieridentität** (dauerhafter Schlüssel nur für PseudoDoc Pro) – ✅ erzeugt am 14.11.2026, Fingerabdruck `53bea630…52b9` (PR 3):
1. Freigabe erzeugen (Termux): `openssl rand -hex 32 > ~/pd-signing-freigabe.txt` – verschlüsselt sichern (`age -p`), offene Datei löschen. **Nie in den Chat.**
2. GitHub → PseudoDoc → Settings → Environments → **New environment** `android-production` → **Add environment secret** `PD_SIGNING_UNLOCK` = Inhalt der Datei.
3. Actions → **„Dauerhafte PseudoDoc-Pro-Signieridentität“** → Run workflow auf `main`, Operation **initialize**. Der Lauf legt einen PR
   `signing/android-identity` an (nur verschlüsseltes Paket und öffentlicher Fingerabdruck). ⚠ Wer die Freigabe verliert, kann keine Updates mehr ausliefern.

**(b) Update-Server** (Termux, ein Block; der Hochlade-Schlüssel der Familie darf schon in `/srv/family-project/updates` schreiben):

```
A=pseudodoc; R=lausiklauskn-png/PseudoDoc; S=root@167.233.204.72
ssh $S "mkdir -p /srv/family-project/updates/$A && echo '{\"probe\":1}' > /srv/family-project/updates/$A/probe.json"
curl -s https://family-projekt.de/updates/$A/probe.json; echo
mkdir -p ~/$A-update && cd ~/$A-update
[ -f signatur.pem ] || openssl genpkey -algorithm ed25519 -out signatur.pem; chmod 600 signatur.pem
gh secret set UPDATE_SIGNING_KEY -R $R < signatur.pem
gh secret set UPDATE_UPLOAD_KEY -R $R < ~/blp-update/upload
gh secret list -R $R | grep UPDATE_
echo "== öffentlicher Schlüssel:"; openssl pkey -in signatur.pem -pubout | sed -n 2p
```

✅ Erledigt am 14.11.2026 (Schlüssel `MCowBQYDK2VwAyEAKLX6…8QQ=` eingetragen). Danach die **eine Zeile** nach „öffentlicher Schlüssel:“ (beginnt mit `MCowBQYDK2VwAyEA`, öffentlich) an Claude geben; sie kommt in
`UpdateFeed.SCHLUESSEL` (Android) **und** `DesktopUpdates.SCHLUESSEL` (Windows). Bis dahin melden Updates „nicht eingerichtet“.

**(c) Veröffentlichen** (erst nach a und b, nur auf Klaus' Wort): Actions → „PseudoDoc Pro Android veröffentlichen“ (Tag `v0.1.0`, voller
main-Commit, `bestaetigung` = `ja`) und „PseudoDoc Pro Windows veröffentlichen“. Die Läufe bauen, signieren, prüfen, veröffentlichen,
unterschreiben den Feed und laden nach `family-projekt.de/updates/pseudodoc/` hoch.

## Grenzen (benannt)

- Kein Android-Gerät, kein Windows-PC, kein Gradle- oder Rust-Bau in der Sitzung – erst `android.yml`/`windows.yml` zeigen, ob es baut.
- Die Ordner-Brücke (FamilyFolders) ist eingebaut und geprüft, die Oberfläche nutzt sie noch nicht (Arbeitsordner in Pro: nächster Schritt).
- Zwischenablage mit Bild in der Android-WebView ungeprüft; dort ist „Teilen …“ an die App der KI der sichere Weg.
