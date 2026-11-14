package de.familyprojekt.pseudodoc.desktop;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.nio.file.attribute.BasicFileAttributes;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import org.json.*;

/**
 * Ordner am PC für große Mengen – derselbe Vertrag „FamilyFolders“ wie unter Android (android/…/DoOrdnerPlugin.java) und in der
 * Familienakte Pro, damit src/quellen.ts unverändert läuft. Die Seite bekommt nur eine Kennung, nie einen Pfad.
 * Gelesen wird in Stücken bis 1 MiB; geschrieben wird nur eine .json-Datei direkt im gewählten Ordner (organizer-index.json) oder direkt
 * im Arbeitsordner „PseudoDoc-Arbeit“ (0.4.3),
 * atomar über eine Zwischendatei. Originale werden nie verändert, nichts wird gelöscht.
 * Gemerkt (dauerhaft, Klaus' Wunsch „Ordnerfreigabe merken“): die zuletzt gewählten Ordner (höchstens 5) mit Namen und Pfad in
 * ordner-v1.json im App-Datenordner. Wieder öffnen geht nur, wenn der Ordner noch da ist und keine Verweise auf dem Weg liegen.
 */
final class DesktopOrdner {
    static final int STUECK=1024*1024;
    static final long MAX_SCHREIBEN=64L*1024*1024;
    static final int MERKEN=5;
    private final Path merkDatei;
    private final DesktopService.Host host;
    private final Map<String,Path> offen=new ConcurrentHashMap<>();
    private final Map<String,Schreiben> schreiben=new ConcurrentHashMap<>();
    private static final class Schreiben { Path ziel,teil; OutputStream out; long groesse; MessageDigest sha; }

    DesktopOrdner(Path merkDatei,DesktopService.Host host){this.merkDatei=merkDatei;this.host=host;}

    JSONObject call(String method,JSONObject o)throws Exception {
        return switch(method){
            case "ordnerWaehlen" -> waehlen();
            case "gemerkt" -> gemerkt();
            case "wiederOeffnen" -> wiederOeffnen(o.optString("id",""));
            case "vergessen" -> vergessen(o.optString("id",""));
            case "ordnerListe" -> new JSONObject().put("eintraege",liste(ordner(o,true)));
            case "dateiInfo" -> new JSONObject().put("art",Files.isDirectory(ordner(o,false),LinkOption.NOFOLLOW_LINKS)?"ordner":"datei");
            case "dateiLesen" -> lesen(o);
            case "dateiBeginn" -> beginn(o);
            case "dateiAnhaengen" -> anhaengen(o);
            case "dateiFertig" -> fertig(o);
            case "pruefsumme" -> pruefsumme(o);
            case "speicherFrei" -> new JSONObject().put("frei",frei(wurzel(o)));
            case "arbeitsordner" -> arbeitsordner(o);
            default -> throw new IOException("INVALID_INPUT");
        };
    }

    // ---------- Pfade ----------
    static boolean nameGueltig(String name){
        return name!=null&&!name.isEmpty()&&name.length()<=255&&!name.equals(".")&&!name.equals("..")
            &&!name.contains("/")&&!name.contains("\\")&&!name.contains(":")&&!name.matches(".*\\p{Cntrl}.*");
    }
    static boolean pfadGueltig(String pfad){
        if(pfad==null)return false;if(pfad.isEmpty())return true;if(pfad.length()>4096)return false;
        for(String teil:pfad.split("/",-1))if(!nameGueltig(teil))return false;
        return true;
    }
    static boolean schreibNameGueltig(String name){return nameGueltig(name)&&name.endsWith(".json")&&!name.startsWith(".");}
    /** Arbeitsordner (Klaus 14.11.): gleich wie NativeUtil.ARBEIT unter Android und src/arbeit.ts. */
    static final String ARBEIT="PseudoDoc-Arbeit";
    /** Schreiben: eine .json direkt im Ordner oder direkt im Arbeitsordner – nie tiefer. */
    static boolean schreibPfadGueltig(String p){
        if(schreibNameGueltig(p))return true;
        return p!=null&&p.startsWith(ARBEIT+"/")&&schreibNameGueltig(p.substring(ARBEIT.length()+1));
    }

    private Path wurzel(JSONObject o)throws IOException {
        Path w=offen.get(o.optString("token",""));if(w==null)throw new IOException("PD_ORDNER_NICHT_ERREICHBAR");return w;
    }
    /** Pfad im Ordner; nie hinaus, keine Verweise (Symlink/Junction) auf dem Weg. */
    private Path ordner(JSONObject o,boolean mussOrdner)throws IOException {
        Path w=wurzel(o);String p=o.optString("pfad","");
        if(!pfadGueltig(p))throw new IOException("PD_PFAD_UNGUELTIG");
        Path ziel=p.isEmpty()?w:w.resolve(p.replace('/',File.separatorChar)).normalize();
        if(!ziel.startsWith(w))throw new IOException("PD_PFAD_UNGUELTIG");
        DesktopFiles.noLinks(ziel);
        if(!Files.exists(ziel,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        if(mussOrdner&&!Files.isDirectory(ziel,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        return ziel;
    }

    // ---------- Wählen und merken ----------
    private JSONObject waehlen()throws Exception {
        JSONObject wahl=host.call("folder",new JSONObject());
        if(wahl.optBoolean("cancelled"))return new JSONObject().put("cancelled",true);
        Path w=Path.of(wahl.getString("path")).toAbsolutePath().normalize();
        return oeffnen(w,true);
    }
    private JSONObject oeffnen(Path w,boolean merken)throws Exception {
        DesktopFiles.noLinks(w);
        if(!Files.isDirectory(w,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_ORDNER_NICHT_ERREICHBAR");
        liste(w); // Probe: lesbar
        String token=UUID.randomUUID().toString();offen.put(token,w);
        String name=w.getFileName()==null?w.toString():w.getFileName().toString();
        JSONObject aus=new JSONObject().put("token",token).put("name",name.isEmpty()?"Ordner":name);
        if(merken)aus.put("id",merke(w,name));
        return aus;
    }
    private synchronized JSONArray merkListe(){
        try{return Files.exists(merkDatei)?new JSONObject(Files.readString(merkDatei,StandardCharsets.UTF_8)).optJSONArray("ordner"):new JSONArray();}
        catch(Exception kaputt){return new JSONArray();}
    }
    private synchronized void merkSchreiben(JSONArray liste)throws IOException {
        DesktopFiles.atomic(merkDatei,new JSONObject().put("fassung",1).put("ordner",liste).toString(1).getBytes(StandardCharsets.UTF_8));
    }
    private synchronized String merke(Path w,String name)throws IOException {
        JSONArray alt=merkListe(),neu=new JSONArray();String id=null;
        for(int i=0;i<alt.length();i++){JSONObject e=alt.getJSONObject(i);if(e.optString("pfad").equals(w.toString()))id=e.optString("id");}
        if(id==null||id.isEmpty())id=UUID.randomUUID().toString();
        neu.put(new JSONObject().put("id",id).put("name",name).put("pfad",w.toString()).put("zeit",System.currentTimeMillis()));
        for(int i=0;i<alt.length()&&neu.length()<MERKEN;i++){JSONObject e=alt.getJSONObject(i);if(!e.optString("id").equals(id))neu.put(e);}
        merkSchreiben(neu);return id;
    }
    /** → {ordner:[{id,name,da}]} – neueste zuerst; der Pfad bleibt in der Engine. */
    private JSONObject gemerkt(){
        JSONArray alt=merkListe(),aus=new JSONArray();
        for(int i=0;i<alt.length();i++){
            JSONObject e=alt.getJSONObject(i);Path p=Path.of(e.optString("pfad","."));
            boolean da;try{DesktopFiles.noLinks(p);da=Files.isDirectory(p,LinkOption.NOFOLLOW_LINKS);}catch(IOException nein){da=false;}
            aus.put(new JSONObject().put("id",e.optString("id")).put("name",e.optString("name")).put("da",da));
        }
        return new JSONObject().put("ordner",aus);
    }
    private JSONObject wiederOeffnen(String id)throws Exception {
        JSONArray alt=merkListe();
        for(int i=0;i<alt.length();i++){JSONObject e=alt.getJSONObject(i);if(e.optString("id").equals(id)&&!id.isEmpty()){
            Path w=Path.of(e.getString("pfad"));
            try{return oeffnen(w,true);}catch(IOException weg){throw new IOException("PD_FREIGABE_FEHLT");}
        }}
        throw new IOException("PD_FREIGABE_FEHLT");
    }
    private synchronized JSONObject vergessen(String id)throws IOException {
        JSONArray alt=merkListe(),neu=new JSONArray();
        for(int i=0;i<alt.length();i++){JSONObject e=alt.getJSONObject(i);if(!e.optString("id").equals(id))neu.put(e);}
        merkSchreiben(neu);return new JSONObject().put("vergessen",alt.length()-neu.length());
    }

    // ---------- Lesen ----------
    /** Kinder eines Ordners mit Name, Art, Größe, Änderungsdatum. Verweise und Unlesbares werden übergangen. */
    static JSONArray liste(Path dir)throws IOException {
        JSONArray aus=new JSONArray();
        try(DirectoryStream<Path> ds=Files.newDirectoryStream(dir)){
            for(Path k:ds){
                String name=k.getFileName().toString();if(!nameGueltig(name))continue;
                BasicFileAttributes a;
                try{a=Files.readAttributes(k,BasicFileAttributes.class,LinkOption.NOFOLLOW_LINKS);}catch(IOException weg){continue;}
                if(a.isSymbolicLink()||a.isOther())continue;
                boolean dir2=a.isDirectory();
                aus.put(new JSONObject().put("name",name).put("art",dir2?"ordner":"datei").put("groesse",dir2?0:a.size()).put("geaendert",a.lastModifiedTime().toMillis()));
            }
        }catch(AccessDeniedException nein){throw new IOException("PD_FREIGABE_FEHLT");}
        catch(NoSuchFileException weg){throw new IOException("PD_NICHT_GEFUNDEN");}
        return aus;
    }
    private JSONObject lesen(JSONObject o)throws IOException {
        Path f=ordner(o,false);if(Files.isDirectory(f,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        long von=Math.max(0,DesktopFiles.integer(o.opt("offset")));
        int laenge=(int)Math.min(STUECK,Math.max(0,DesktopFiles.integer(o.opt("laenge"))));
        byte[] aus;
        try(FileChannel k=FileChannel.open(f,StandardOpenOption.READ,LinkOption.NOFOLLOW_LINKS)){
            k.position(von);java.nio.ByteBuffer b=java.nio.ByteBuffer.allocate(laenge);
            while(b.hasRemaining()){if(k.read(b)<0)break;}
            aus=Arrays.copyOf(b.array(),b.position());
        }catch(AccessDeniedException nein){throw new IOException("PD_FREIGABE_FEHLT");}
        return new JSONObject().put("data",Base64.getEncoder().encodeToString(aus));
    }

    // ---------- Schreiben (nur organizer-index.json o. ä. direkt im Ordner) ----------
    private JSONObject beginn(JSONObject o)throws Exception {
        Path w=wurzel(o);String name=o.optString("pfad","");
        if(!schreibPfadGueltig(name))throw new IOException("PD_NICHT_ERLAUBT");
        Path ziel=w.resolve(name.replace('/',File.separatorChar)).normalize();
        if(!ziel.startsWith(w))throw new IOException("PD_NICHT_ERLAUBT");
        DesktopFiles.noLinks(ziel);
        if(!Files.isDirectory(ziel.getParent(),LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        if(Files.isDirectory(ziel,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_ERLAUBT");
        Schreiben s=new Schreiben();s.ziel=ziel;s.sha=MessageDigest.getInstance("SHA-256");
        try{s.teil=Files.createTempFile(ziel.getParent(),".do-",".tmp");s.out=Files.newOutputStream(s.teil);}
        catch(IOException nein){throw new IOException("PD_SCHREIBEN_FEHLT");}
        String id=UUID.randomUUID().toString();schreiben.put(id,s);
        return new JSONObject().put("id",id);
    }
    private JSONObject anhaengen(JSONObject o)throws IOException {
        Schreiben s=schreiben.get(o.optString("id",""));
        if(s==null||DesktopFiles.integer(o.opt("offset"))!=s.groesse)throw new IOException("PD_STUECK_UNGUELTIG");
        String data=o.optString("data","");if(data.length()>((STUECK+2)/3)*4)throw new IOException("PD_STUECK_UNGUELTIG");
        byte[] b;try{b=Base64.getDecoder().decode(data);}catch(IllegalArgumentException kaputt){throw new IOException("PD_STUECK_UNGUELTIG");}
        if(s.groesse+b.length>MAX_SCHREIBEN){abbrechen(o.optString("id"));throw new IOException("PD_AUSGABE_ZU_GROSS");}
        s.out.write(b);s.sha.update(b);s.groesse+=b.length;
        return new JSONObject().put("size",s.groesse);
    }
    private JSONObject fertig(JSONObject o)throws IOException {
        Schreiben s=schreiben.remove(o.optString("id",""));if(s==null)throw new IOException("PD_STUECK_UNGUELTIG");
        try{
            s.out.flush();s.out.close();
            if(DesktopFiles.integer(o.opt("size"))!=s.groesse)throw new IOException("PD_STUECK_UNGUELTIG");
            Files.move(s.teil,s.ziel,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);
        }finally{Files.deleteIfExists(s.teil);}
        return new JSONObject().put("size",s.groesse).put("sha256",DesktopFiles.hex(s.sha.digest()));
    }
    // ---------- Große Ordner (0.4.3, Klaus 14.11.) ----------
    /** Fingerabdruck am Ort, Stück für Stück – die Bytes gehen nie durch die Brücke. */
    private JSONObject pruefsumme(JSONObject o)throws Exception {
        Path f=ordner(o,false);if(Files.isDirectory(f,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        MessageDigest sha=MessageDigest.getInstance("SHA-256");long n=0;
        try(InputStream in=Files.newInputStream(f,LinkOption.NOFOLLOW_LINKS)){
            byte[] b=new byte[STUECK];int r;while((r=in.read(b))>0){sha.update(b,0,r);n+=r;}
        }catch(AccessDeniedException nein){throw new IOException("PD_FREIGABE_FEHLT");}
        return new JSONObject().put("sha256",DesktopFiles.hex(sha.digest())).put("groesse",n);
    }
    static long frei(Path w){try{return Files.getFileStore(w).getUsableSpace();}catch(IOException unbekannt){return -1;}}
    /** Im gewählten Laufwerk/Ordner entsteht „PseudoDoc-Arbeit“ (heißt der gewählte Ordner schon so, gilt er selbst); nie im Pro-Tresor. */
    private JSONObject arbeitsordner(JSONObject o)throws IOException {
        Path w=wurzel(o);
        if(Files.exists(w.resolve("tresorordner.json"),LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_TRESOR_ORDNER");
        if(w.getFileName()!=null&&ARBEIT.equals(w.getFileName().toString()))return new JSONObject().put("pfad","").put("neu",false);
        Path a=w.resolve(ARBEIT);DesktopFiles.noLinks(a);
        if(Files.exists(a,LinkOption.NOFOLLOW_LINKS)){
            if(!Files.isDirectory(a,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_ERLAUBT");
            return new JSONObject().put("pfad",ARBEIT).put("neu",false);
        }
        try{Files.createDirectory(a);}catch(IOException nein){throw new IOException("PD_SCHREIBEN_FEHLT");}
        return new JSONObject().put("pfad",ARBEIT).put("neu",true);
    }

    private void abbrechen(String id){
        Schreiben s=schreiben.remove(id);if(s==null)return;
        try{s.out.close();}catch(IOException egal){/* weiter */}
        try{Files.deleteIfExists(s.teil);}catch(IOException egal){/* weiter */}
    }
}
