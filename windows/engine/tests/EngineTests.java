package de.familyprojekt.pseudodoc.desktop;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.PrivateKey;
import java.security.SecureRandom;
import java.util.*;
import org.json.*;

/** Prüft die Windows-Engine ohne Windows: echte Verträge von DesktopService mit einer gestellten Hülle (Ordner- und
 *  Speichern-Dialog → feste Antworten). Gezählt wird jede Zeile; ein Fehler bricht ab. */
public final class EngineTests {
    static int ok=0;
    static void check(String name,boolean value){if(!value)throw new AssertionError("ROT: "+name);ok++;System.out.println("PASS "+name);}
    static String fehler(java.util.concurrent.Callable<?> c){try{c.call();return "";}catch(Exception e){return DesktopService.code(e);}}

    static final class Fake implements DesktopService.Host {
        Path folder,save;final List<String> calls=new ArrayList<>();
        public JSONObject call(String method,JSONObject o)throws Exception {
            calls.add(method);
            switch(method){
                case "folder": return folder==null?new JSONObject().put("cancelled",true):new JSONObject().put("path",folder.toString());
                case "saveLocation": return save==null?new JSONObject().put("cancelled",true):new JSONObject().put("path",save.resolve(o.getString("name")).toString());
                default: throw new java.io.IOException("NOT_ALLOWED");
            }
        }
    }
    static JSONObject call(DesktopService s,String plugin,String method,JSONObject o)throws Exception{return s.call(plugin,method,o);}
    static JSONObject o(Object... kv){JSONObject j=new JSONObject();for(int i=0;i<kv.length;i+=2)j.put((String)kv[i],kv[i+1]);return j;}
    static String b64(byte[] b){return Base64.getEncoder().encodeToString(b);}
    static byte[] unb64(String s){return Base64.getDecoder().decode(s);}

    public static void main(String[] args)throws Exception {
        Path tmp=Files.createTempDirectory("do-engine-");
        try{run(tmp);updates(tmp);}finally{
            try(var w=Files.walk(tmp)){w.sorted(Comparator.reverseOrder()).forEach(p->p.toFile().delete());}
        }
        System.out.println(ok+" grün, 0 rot");
    }

    static void run(Path tmp)throws Exception {
        Fake host=new Fake();Path data=tmp.resolve("app"),eingang=tmp.resolve("Eingang Ä");
        Files.createDirectories(eingang.resolve("2026/Bank"));
        byte[] gross=new byte[2_500_000];new SecureRandom().nextBytes(gross);
        Files.write(eingang.resolve("2026/Bank/Auszug März.pdf"),gross);
        Files.writeString(eingang.resolve("brief.txt"),"Hallo",StandardCharsets.UTF_8);
        DesktopService s=new DesktopService(data,host);

        // ---------- Ordner wählen, lesen ----------
        check("Ordner: Abbrechen im Dialog → cancelled",call(s,"FamilyFolders","ordnerWaehlen",o()).optBoolean("cancelled"));
        host.folder=eingang;
        JSONObject w=call(s,"FamilyFolders","ordnerWaehlen",o());
        String token=w.getString("token");
        check("Ordner: Kennung statt Pfad, Name des Ordners",!token.contains(eingang.toString())&&w.getString("name").equals("Eingang Ä")&&!w.toString().contains(tmp.toString()));
        JSONArray wurzel=call(s,"FamilyFolders","ordnerListe",o("token",token,"pfad","")).getJSONArray("eintraege");
        Map<String,JSONObject> nach=new HashMap<>();for(int i=0;i<wurzel.length();i++)nach.put(wurzel.getJSONObject(i).getString("name"),wurzel.getJSONObject(i));
        check("Ordner: Liste mit Art, Größe, Änderungsdatum",nach.get("2026").getString("art").equals("ordner")&&nach.get("brief.txt").getLong("groesse")==5&&nach.get("brief.txt").getLong("geaendert")>0);
        JSONArray bank=call(s,"FamilyFolders","ordnerListe",o("token",token,"pfad","2026/Bank")).getJSONArray("eintraege");
        check("Ordner: Unterordner mit Umlaut im Namen",bank.length()==1&&bank.getJSONObject(0).getString("name").equals("Auszug März.pdf")&&bank.getJSONObject(0).getLong("groesse")==gross.length);
        java.io.ByteArrayOutputStream zus=new java.io.ByteArrayOutputStream();
        for(int off=0;off<gross.length;off+=DesktopOrdner.STUECK)zus.write(unb64(call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","2026/Bank/Auszug März.pdf","offset",off,"laenge",Math.min(DesktopOrdner.STUECK,gross.length-off))).getString("data")));
        check("Ordner: in Stücken gelesen = Original (2,5 MB)",Arrays.equals(zus.toByteArray(),gross));
        check("Ordner: höchstens 1 MiB je Stück",unb64(call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","2026/Bank/Auszug März.pdf","offset",0,"laenge",5_000_000)).getString("data")).length==DesktopOrdner.STUECK);
        check("Ordner: dateiInfo kennt Ordner und Datei",call(s,"FamilyFolders","dateiInfo",o("token",token,"pfad","2026")).getString("art").equals("ordner")&&call(s,"FamilyFolders","dateiInfo",o("token",token,"pfad","brief.txt")).getString("art").equals("datei"));
        check("Ordner: „..“ und absolute Pfade werden abgewiesen",fehler(()->call(s,"FamilyFolders","ordnerListe",o("token",token,"pfad","..")))
            .equals("PD_PFAD_UNGUELTIG")&&fehler(()->call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","C:\\Windows\\win.ini","offset",0,"laenge",10))).equals("PD_PFAD_UNGUELTIG")
            &&fehler(()->call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","2026/../../x","offset",0,"laenge",10))).equals("PD_PFAD_UNGUELTIG"));
        check("Ordner: fremde Kennung → nicht erreichbar",fehler(()->call(s,"FamilyFolders","ordnerListe",o("token","x","pfad",""))).equals("PD_ORDNER_NICHT_ERREICHBAR"));
        check("Ordner: Zahlen als Text werden abgewiesen",fehler(()->call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","brief.txt","offset","0","laenge",10))).equals("INVALID_NUMBER"));
        try{
            Path ziel=tmp.resolve("geheim");Files.createDirectories(ziel);Files.writeString(ziel.resolve("x.txt"),"geheim");
            Files.createSymbolicLink(eingang.resolve("verweis"),ziel);
            boolean nichtGelistet=true;JSONArray l=call(s,"FamilyFolders","ordnerListe",o("token",token,"pfad","")).getJSONArray("eintraege");
            for(int i=0;i<l.length();i++)if(l.getJSONObject(i).getString("name").equals("verweis"))nichtGelistet=false;
            check("Ordner: Verweise werden weder gelistet noch gelesen",nichtGelistet&&fehler(()->call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","verweis/x.txt","offset",0,"laenge",10))).equals("ORDNER_VERWEIS"));
            Files.delete(eingang.resolve("verweis"));
        }catch(UnsupportedOperationException|java.io.IOException keinVerweis){System.out.println("(Verweise hier nicht anlegbar: übersprungen)");}

        // ---------- Index schreiben ----------
        byte[] index=("{\"x\":\""+"ä".repeat(700_000)+"\"}").getBytes(StandardCharsets.UTF_8);
        String id=call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","organizer-index.json")).getString("id");
        for(int off=0;off<index.length;off+=DesktopOrdner.STUECK)call(s,"FamilyFolders","dateiAnhaengen",o("id",id,"offset",off,"data",b64(Arrays.copyOfRange(index,off,Math.min(index.length,off+DesktopOrdner.STUECK)))));
        JSONObject f=call(s,"FamilyFolders","dateiFertig",o("id",id,"size",index.length));
        check("Index: in Stücken geschrieben, Größe und SHA-256",Arrays.equals(Files.readAllBytes(eingang.resolve("organizer-index.json")),index)&&f.getLong("size")==index.length
            &&f.getString("sha256").equals(DesktopFiles.hex(java.security.MessageDigest.getInstance("SHA-256").digest(index))));
        String id2=call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","organizer-index.json")).getString("id");
        call(s,"FamilyFolders","dateiAnhaengen",o("id",id2,"offset",0,"data",b64("{}".getBytes())));call(s,"FamilyFolders","dateiFertig",o("id",id2,"size",2));
        check("Index: kürzerer Stand ersetzt ganz (keine alten Bytes am Ende)",Files.readString(eingang.resolve("organizer-index.json")).equals("{}"));
        String id3=call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","organizer-index.json")).getString("id");
        call(s,"FamilyFolders","dateiAnhaengen",o("id",id3,"offset",0,"data",b64("{\"neu\":1}".getBytes())));
        check("Index: falsche Größe am Ende → abgelehnt, alter Stand bleibt",fehler(()->call(s,"FamilyFolders","dateiFertig",o("id",id3,"size",3))).equals("PD_STUECK_UNGUELTIG")&&Files.readString(eingang.resolve("organizer-index.json")).equals("{}"));
        check("Index: keine Zwischendatei bleibt liegen",Files.list(eingang).noneMatch(p->p.getFileName().toString().startsWith(".do-")));
        check("Index: nur .json direkt im Ordner – keine Unterordner, keine anderen Dateien",fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","2026/x.json"))).equals("PD_NICHT_ERLAUBT")
            &&fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","brief.txt"))).equals("PD_NICHT_ERLAUBT")&&fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad",".x.json"))).equals("PD_NICHT_ERLAUBT"));
        check("Index: Originale unverändert",Arrays.equals(Files.readAllBytes(eingang.resolve("2026/Bank/Auszug März.pdf")),gross)&&Files.readString(eingang.resolve("brief.txt")).equals("Hallo"));

        // ---------- Große Ordner (0.4.3): Prüfsumme am Ort, freier Speicher, Arbeitsordner ----------
        JSONObject ps=call(s,"FamilyFolders","pruefsumme",o("token",token,"pfad","2026/Bank/Auszug März.pdf"));
        check("Groß: Prüfsumme am Ort = SHA-256 der Datei, mit Größe",ps.getString("sha256").equals(DesktopFiles.hex(java.security.MessageDigest.getInstance("SHA-256").digest(gross)))&&ps.getLong("groesse")==gross.length);
        check("Groß: Prüfsumme nur für Dateien im Ordner",fehler(()->call(s,"FamilyFolders","pruefsumme",o("token",token,"pfad","2026"))).equals("PD_NICHT_GEFUNDEN")
            &&fehler(()->call(s,"FamilyFolders","pruefsumme",o("token",token,"pfad","../x"))).equals("PD_PFAD_UNGUELTIG"));
        check("Groß: freier Speicher wird gemeldet",call(s,"FamilyFolders","speicherFrei",o("token",token)).getLong("frei")>0);
        check("Arbeit: ohne Arbeitsordner kein Schreiben dorthin",fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","PseudoDoc-Arbeit/stand.json"))).equals("PD_NICHT_GEFUNDEN"));
        JSONObject ao=call(s,"FamilyFolders","arbeitsordner",o("token",token));
        check("Arbeit: Arbeitsordner wird angelegt",ao.getString("pfad").equals("PseudoDoc-Arbeit")&&ao.getBoolean("neu")&&Files.isDirectory(eingang.resolve("PseudoDoc-Arbeit")));
        check("Arbeit: zweites Mal derselbe, nicht neu",!call(s,"FamilyFolders","arbeitsordner",o("token",token)).getBoolean("neu"));
        String ida=call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","PseudoDoc-Arbeit/stand.json")).getString("id");
        call(s,"FamilyFolders","dateiAnhaengen",o("id",ida,"offset",0,"data",b64("{\"a\":1}".getBytes())));call(s,"FamilyFolders","dateiFertig",o("id",ida,"size",7));
        check("Arbeit: .json direkt im Arbeitsordner geschrieben und wieder lesbar",Files.readString(eingang.resolve("PseudoDoc-Arbeit/stand.json")).equals("{\"a\":1}")
            &&new String(unb64(call(s,"FamilyFolders","dateiLesen",o("token",token,"pfad","PseudoDoc-Arbeit/stand.json","offset",0,"laenge",100)).getString("data"))).equals("{\"a\":1}"));
        check("Arbeit: nicht tiefer, nicht in andere Ordner, nur .json",fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","PseudoDoc-Arbeit/x/y.json"))).equals("PD_NICHT_ERLAUBT")
            &&fehler(()->call(s,"FamilyFolders","dateiBeginn",o("token",token,"pfad","PseudoDoc-Arbeit/x.pdf"))).equals("PD_NICHT_ERLAUBT"));
        Path tres=tmp.resolve("Family-Projekt");Files.createDirectories(tres);Files.writeString(tres.resolve("tresorordner.json"),"{}");
        host.folder=tres;String tt=call(s,"FamilyFolders","ordnerWaehlen",o()).getString("token");
        check("Arbeit: nie im Pro-Tresor (Ordner mit tresorordner.json)",fehler(()->call(s,"FamilyFolders","arbeitsordner",o("token",tt))).equals("PD_TRESOR_ORDNER")&&!Files.exists(tres.resolve("PseudoDoc-Arbeit")));
        call(s,"FamilyFolders","vergessen",o("id",call(s,"FamilyFolders","gemerkt",o()).getJSONArray("ordner").getJSONObject(0).getString("id")));
        host.folder=eingang;

        // ---------- Gemerkt (dauerhafte Freigabe) ----------
        JSONArray g=call(s,"FamilyFolders","gemerkt",o()).getJSONArray("ordner");
        check("Gemerkt: der gewählte Ordner steht in der Liste, ohne Pfad",g.length()==1&&g.getJSONObject(0).getString("name").equals("Eingang Ä")&&g.getJSONObject(0).getBoolean("da")&&!g.toString().contains(tmp.toString()));
        String gid=g.getJSONObject(0).getString("id");
        DesktopService s2=new DesktopService(data,new Fake());
        JSONObject wieder=call(s2,"FamilyFolders","wiederOeffnen",o("id",gid));
        check("Gemerkt: nach Neustart ohne Dialog wieder geöffnet und lesbar",wieder.getString("name").equals("Eingang Ä")&&call(s2,"FamilyFolders","ordnerListe",o("token",wieder.getString("token"),"pfad","")).getJSONArray("eintraege").length()>=2);
        check("Gemerkt: alte Kennung aus der vorigen Sitzung gilt nicht mehr",fehler(()->call(s2,"FamilyFolders","ordnerListe",o("token",token,"pfad",""))).equals("PD_ORDNER_NICHT_ERREICHBAR"));
        for(int i=0;i<7;i++){Path x=tmp.resolve("Ordner "+i);Files.createDirectories(x);host.folder=x;call(s,"FamilyFolders","ordnerWaehlen",o());}
        g=call(s,"FamilyFolders","gemerkt",o()).getJSONArray("ordner");
        check("Gemerkt: höchstens 5, neueste zuerst",g.length()==5&&g.getJSONObject(0).getString("name").equals("Ordner 6"));
        Path weg=tmp.resolve("Ordner 6");Files.delete(weg);
        g=call(s,"FamilyFolders","gemerkt",o()).getJSONArray("ordner");String gweg=g.getJSONObject(0).getString("id");
        check("Gemerkt: verschwundener Ordner wird als nicht da gemeldet und nicht geöffnet",!g.getJSONObject(0).getBoolean("da")&&fehler(()->call(s,"FamilyFolders","wiederOeffnen",o("id",gweg))).equals("PD_FREIGABE_FEHLT"));
        call(s,"FamilyFolders","vergessen",o("id",gweg));
        check("Gemerkt: vergessen nimmt ihn aus der Liste",call(s,"FamilyFolders","gemerkt",o()).getJSONArray("ordner").length()==4);
        check("Gemerkt: unbekannte Kennung → keine Freigabe",fehler(()->call(s,"FamilyFolders","wiederOeffnen",o("id","gibt-es-nicht"))).equals("PD_FREIGABE_FEHLT"));

        // ---------- Öffnen mit (Eingang) ----------
        check("Eingang: leer → kein Stapel",call(s,"DoEingang","abholen",o()).getString("stapel").isEmpty());
        JSONArray pfade=new JSONArray().put(eingang.resolve("brief.txt").toString()).put(eingang.resolve("2026/Bank/Auszug März.pdf").toString())
            .put(eingang.resolve("2026").toString()).put(tmp.resolve("fehlt.pdf").toString());
        JSONObject r=call(s,"DesktopInternal","receive",o("paths",pfade));
        check("Eingang: nur Dateien übernommen (Ordner und Fehlendes übergangen)",r.getInt("neu")==2);
        call(s,"DesktopInternal","receive",o("paths",new JSONArray().put(eingang.resolve("brief.txt").toString())));
        JSONObject st=call(s,"DoEingang","abholen",o());
        JSONArray d=st.getJSONArray("dateien");
        check("Eingang: ältester Stapel zuerst, weitere gemeldet",d.length()==2&&st.getInt("weitere")==1);
        String stapel=st.getString("stapel");String name=null;long groesse=0;
        for(int i=0;i<d.length();i++)if(d.getJSONObject(i).getString("name").startsWith("Auszug")){name=d.getJSONObject(i).getString("name");groesse=d.getJSONObject(i).getLong("groesse");}
        java.io.ByteArrayOutputStream ein=new java.io.ByteArrayOutputStream();
        for(long off=0;off<groesse;off+=DesktopOrdner.STUECK)ein.write(unb64(call(s,"DoEingang","lesen",o("stapel",stapel,"name",name,"offset",off,"laenge",DesktopOrdner.STUECK)).getString("data")));
        check("Eingang: Kopie in Stücken gelesen = Original",Arrays.equals(ein.toByteArray(),gross));
        check("Eingang: zweiter Stapel kommt beim nächsten Abholen",call(s,"DoEingang","abholen",o()).getJSONArray("dateien").length()==1&&call(s,"DoEingang","abholen",o()).getString("stapel").isEmpty());
        check("Eingang: abgeholter Stapel bleibt lesbar (Ansehen)",unb64(call(s,"DoEingang","lesen",o("stapel",stapel,"name",name,"offset",0,"laenge",4)).getString("data")).length==4);
        String s3=stapel;
        check("Eingang: kein Ausbruch aus dem Stapel",fehler(()->call(s,"DoEingang","lesen",o("stapel",s3,"name","..","offset",0,"laenge",4))).equals("PD_NICHT_GEFUNDEN")
            &&fehler(()->call(s,"DoEingang","lesen",o("stapel","../app","name","x","offset",0,"laenge",4))).equals("PD_NICHT_GEFUNDEN"));
        check("Eingang: Originale unverändert",Arrays.equals(Files.readAllBytes(eingang.resolve("2026/Bank/Auszug März.pdf")),gross));
        s.eingang.aufraeumen(System.currentTimeMillis()+15L*24*3600*1000);
        check("Eingang: abgeholte Stapel nach 14 Tagen weg",fehler(()->call(s,"DoEingang","lesen",o("stapel",s3,"name","brief.txt","offset",0,"laenge",4))).equals("PD_NICHT_GEFUNDEN"));
        check("Eingang: Dateinamen ohne Windows-Sonderzeichen",DesktopFiles.filename("a:b.txt").equals("a_b.txt"));

        // ---------- Speichern unter ----------
        check("Speichern: Abbrechen → nicht gespeichert",!call(s,"DoDateien","speichern",o("name","organizer-index.json","data",b64("{}".getBytes()))).getBoolean("gespeichert"));
        host.save=tmp.resolve("Downloads");Files.createDirectories(host.save);
        JSONObject sp=call(s,"DoDateien","speichern",o("name","organizer:index?.json","data",b64("{\"a\":1}".getBytes())));
        check("Speichern: dorthin, wo der Mensch zeigt, Name ohne verbotene Zeichen",sp.getBoolean("gespeichert")&&Files.readString(host.save.resolve("organizer_index_.json")).equals("{\"a\":1}"));
        check("Speichern: kaputtes Base64 → abgelehnt",fehler(()->call(s,"DoDateien","speichern",o("name","x.json","data","%%%"))).equals("PD_DATEI_UNGUELTIG"));
        check("Info: Plattform und Fassung",call(s,"DesktopInternal","info",o()).getString("plattform").equals("windows")&&call(s,"DoDateien","appInfo",o()).getString("version").equals(DesktopBuild.VERSION));
        check("Unbekannter Vertrag → abgewiesen",fehler(()->call(s,"Unbekannt","x",o())).equals("INVALID_INPUT")&&fehler(()->call(s,"FamilyFolders","loeschen",o())).equals("INVALID_INPUT"));
    }

    // ---------- Updates von Klaus' Server (Wegwerf-Schlüssel, gestelltes Netz) ----------
    static final Map<String,byte[]> SERVER=new HashMap<>();
    static String sig(PrivateKey k,byte[] d)throws Exception{java.security.Signature s=java.security.Signature.getInstance("Ed25519");s.initSign(k);s.update(d);return Base64.getEncoder().encodeToString(s.sign());}
    static String datei(String v){return "PseudoDoc-Pro-Windows-"+v+"-x64-setup.exe";}
    static byte[] feed(String v,byte[] setup,String datei,String app)throws Exception{
        return new JSONObject().put("format",1).put("app",app).put("version",v).put("windows",new JSONObject().put("datei",datei).put("groesse",setup.length)
            .put("sha256",DesktopFiles.hex(java.security.MessageDigest.getInstance("SHA-256").digest(setup)))).toString().getBytes(StandardCharsets.UTF_8);
    }
    static byte[] feed(String v,byte[] setup,String datei)throws Exception{return feed(v,setup,datei,"pseudodoc");}
    static void updates(Path tmp)throws Exception{
        java.security.KeyPairGenerator g=java.security.KeyPairGenerator.getInstance("Ed25519");
        java.security.KeyPair echt=g.generateKeyPair(),fremd=g.generateKeyPair();
        String pub=Base64.getEncoder().encodeToString(echt.getPublic().getEncoded());
        List<String> geholt=new ArrayList<>();
        DesktopUpdates.Netz netz=new DesktopUpdates.Netz(){
            public byte[] holen(String url,long grenze)throws Exception{geholt.add(url);byte[] b=SERVER.get(url);if(b==null)throw new java.io.IOException("UPDATE_NICHT_ERREICHBAR");if(b.length>grenze)throw new java.io.IOException("UPDATE_UNGUELTIG");return b;}
            public java.io.InputStream strom(String url)throws Exception{geholt.add(url);byte[] b=SERVER.get(url);if(b==null)throw new java.io.IOException("UPDATE_NICHT_ERREICHBAR");return new java.io.ByteArrayInputStream(b);}
        };
        String B=DesktopUpdates.BASIS;Path ordner=tmp.resolve("update");
        check("Update: Basis ist der eigene Ordner des Organizers",B.equals("https://family-projekt.de/updates/pseudodoc/")&&DesktopUpdates.FEED.equals("aktuell-windows.json"));
        if(DesktopUpdates.SCHLUESSEL.isEmpty()){
            DesktopUpdates leer=new DesktopUpdates(ordner,netz,"0.4.0",DesktopUpdates.SCHLUESSEL);
            check("Update: ohne eingetragenen Schlüssel → nicht eingerichtet, kein Netzabruf",fehler(leer::pruefen).equals("UPDATE_NICHT_EINGERICHTET")&&geholt.isEmpty());
        }else check("Update: der eingebaute Schlüssel ist ein gültiger Ed25519-Schlüssel",java.security.KeyFactory.getInstance("Ed25519").generatePublic(new java.security.spec.X509EncodedKeySpec(Base64.getDecoder().decode(DesktopUpdates.SCHLUESSEL)))!=null);
        DesktopUpdates u=new DesktopUpdates(ordner,netz,"0.4.0",pub);
        check("Update: Server nicht erreichbar → klare Meldung",fehler(u::pruefen).equals("UPDATE_NICHT_ERREICHBAR"));
        byte[] setup=new byte[3_000_000];new SecureRandom().nextBytes(setup);String datei=datei("0.4.1");
        byte[] f=feed("0.4.1",setup,datei);
        SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(fremd.getPrivate(),f).getBytes());SERVER.put(B+datei,setup);
        check("Update: fremde Unterschrift wird abgelehnt",fehler(u::pruefen).equals("UPDATE_UNTERSCHRIFT_FALSCH"));
        SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),f).getBytes());
        byte[] f2=f.clone();f2[f2.length-3]^=1;SERVER.put(B+DesktopUpdates.FEED,f2);
        check("Update: veränderte Angaben mit alter Unterschrift → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNTERSCHRIFT_FALSCH"));
        byte[] andere=feed("0.4.1",setup,"BookLedgerPro-Windows-0.4.1-x64-setup.exe","bookledgerpro");SERVER.put(B+DesktopUpdates.FEED,andere);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),andere).getBytes());
        check("Update: Feed einer anderen App (auch unterschrieben) → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNGUELTIG"));
        SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),f).getBytes());
        JSONObject r=u.pruefen();
        check("Update: Neu 0.4.1 (installiert 0.4.0) mit Größe",r.optString("neu").equals("0.4.1")&&r.optString("installiert").equals("0.4.0")&&r.optLong("groesse")==setup.length);
        Path p=u.laden();
        check("Update: Setup geladen, Größe und SHA-256 stimmen, nur im Update-Ordner",Files.size(p)==setup.length&&p.startsWith(ordner)&&p.getFileName().toString().equals(datei));
        check("Update: Setup-Adresse = feste Basis + Name (nichts aus fremder Quelle)",geholt.stream().allMatch(x->x.startsWith(B)));
        SERVER.put(B+datei,Arrays.copyOf(setup,setup.length-1));u.pruefen();
        check("Update: abgeschnittenes Setup → beschädigt, nichts bleibt liegen",fehler(u::laden).equals("UPDATE_BESCHAEDIGT")&&!Files.exists(ordner.resolve(datei+".teil"))&&!Files.exists(ordner.resolve(datei)));
        byte[] alt=feed("0.3.4",setup,datei("0.3.4"));SERVER.put(B+DesktopUpdates.FEED,alt);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),alt).getBytes());
        check("Update: alter echter Stand gilt nicht als neu",u.pruefen().optBoolean("aktuell"));
        byte[] gleich=feed("0.4.0",setup,datei("0.4.0"));SERVER.put(B+DesktopUpdates.FEED,gleich);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),gleich).getBytes());
        check("Update: gleiche Version → „aktuell“",u.pruefen().optBoolean("aktuell")&&u.pruefen().optString("version").equals("0.4.0"));
        byte[] boese=feed("0.4.2",setup,"..\\..\\evil.exe");SERVER.put(B+DesktopUpdates.FEED,boese);SERVER.put(B+DesktopUpdates.FEED+".sig",sig(echt.getPrivate(),boese).getBytes());
        check("Update: fremder Dateiname (auch unterschrieben) → abgelehnt",fehler(u::pruefen).equals("UPDATE_UNGUELTIG"));
        check("Update: ohne Prüfung kein Laden",fehler(u::laden).equals("UPDATE_NICHT_GEPRUEFT"));
        check("Update: Versionsvergleich",DesktopUpdates.neuer("0.10.0","0.9.9")&&!DesktopUpdates.neuer("0.4.0","0.4.0")&&!DesktopUpdates.neuer("1.0.0-x","0.1.0"));
        // Gleiche Unterschrift wie im Veröffentlichungs-Lauf (openssl pkeyutl -sign -rawin, Base64 mit Zeilenende).
        Path k=tmp.resolve("k.pem"),dd=tmp.resolve("d.json"),sb=tmp.resolve("s.bin");
        if(new ProcessBuilder("openssl","genpkey","-algorithm","ed25519","-out",k.toString()).inheritIO().start().waitFor()==0){
            Files.write(dd,f);
            new ProcessBuilder("openssl","pkeyutl","-sign","-rawin","-inkey",k.toString(),"-in",dd.toString(),"-out",sb.toString()).inheritIO().start().waitFor();
            Process pp=new ProcessBuilder("openssl","pkey","-in",k.toString(),"-pubout","-outform","DER").start();byte[] der=pp.getInputStream().readAllBytes();pp.waitFor();
            String opub=Base64.getEncoder().encodeToString(der);
            SERVER.put(B+DesktopUpdates.FEED,f);SERVER.put(B+DesktopUpdates.FEED+".sig",(Base64.getEncoder().encodeToString(Files.readAllBytes(sb))+"\n").getBytes());
            check("Update: Unterschrift von openssl (wie in GitHub) wird erkannt",new DesktopUpdates(ordner,netz,"0.4.0",opub).pruefen().optString("neu").equals("0.4.1"));
        } else System.out.println("(openssl fehlt: Gegenprobe mit openssl übersprungen)");
    }
}
