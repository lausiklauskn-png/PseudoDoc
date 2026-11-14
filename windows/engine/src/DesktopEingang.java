package de.familyprojekt.pseudodoc.desktop;

import java.io.*;
import java.nio.channels.FileChannel;
import java.nio.file.*;
import java.util.*;
import org.json.*;

/**
 * „Öffnen mit → PseudoDoc Pro“ und Dateien auf dem Programmsymbol (Windows). Gleicher Vertrag „DoEingang“ wie das Teilen an
 * die App unter Android. Die Hülle reicht die Pfade aus dem (zweiten) Programmstart; die Engine legt eine KOPIE in einen Stapel
 * im App-Datenordner (die Originale bleiben unberührt). Die Seite holt einen Stapel ab (abholen) und liest daraus in Stücken
 * (lesen) – die Stücke bleiben liegen, damit „Ansehen“ später noch geht; abgeholte Stapel älter als 14 Tage räumt der Start weg.
 */
final class DesktopEingang {
    static final int MAX_DATEIEN=500;
    static final long MAX_DATEI=512L*1024*1024, MAX_STAPEL=2L*1024*1024*1024, AUFHEBEN=14L*24*3600*1000;
    private final Path ordner;

    DesktopEingang(Path ordner)throws IOException {
        this.ordner=ordner;DesktopFiles.noLinks(ordner);Files.createDirectories(ordner);aufraeumen(System.currentTimeMillis());
    }

    JSONObject call(String method,JSONObject o)throws Exception {
        return switch(method){
            case "abholen" -> abholen();
            case "lesen" -> lesen(o);
            default -> throw new IOException("INVALID_INPUT");
        };
    }

    /** Kopiert die genannten Dateien in einen neuen Stapel. Ordner, Verweise, Unlesbares und Übergroßes werden übergangen. */
    synchronized int receive(JSONArray paths)throws IOException {
        List<Path> dateien=new ArrayList<>();long summe=0;
        for(int i=0;i<paths.length()&&dateien.size()<MAX_DATEIEN;i++){
            Path p=Path.of(paths.getString(i)).toAbsolutePath().normalize();
            try{DesktopFiles.noLinks(p);}catch(IOException verweis){continue;}
            if(!Files.isRegularFile(p,LinkOption.NOFOLLOW_LINKS))continue;
            long g=Files.size(p);if(g>MAX_DATEI||summe+g>MAX_STAPEL)continue;
            summe+=g;dateien.add(p);
        }
        if(dateien.isEmpty())return 0;
        String stapel=System.currentTimeMillis()+"-"+UUID.randomUUID().toString().substring(0,8);
        Path dir=ordner.resolve(stapel),teil=ordner.resolve(stapel+".teil");Files.createDirectories(teil);
        Set<String> namen=new HashSet<>();int n=0;
        for(Path p:dateien){
            String name=DesktopFiles.filename(p.getFileName().toString()),stamm=name;
            for(int k=2;!namen.add(name.toLowerCase(Locale.ROOT));k++){int dot=stamm.lastIndexOf('.');name=dot>0?stamm.substring(0,dot)+" ("+k+")"+stamm.substring(dot):stamm+" ("+k+")";}
            try{Files.copy(p,teil.resolve(name),StandardCopyOption.COPY_ATTRIBUTES);n++;}catch(IOException unlesbar){namen.remove(name.toLowerCase(Locale.ROOT));}
        }
        if(n==0){loeschen(teil);return 0;}
        Files.move(teil,dir,StandardCopyOption.ATOMIC_MOVE);
        return n;
    }

    /** Ältesten noch nicht abgeholten Stapel abgeben: {stapel, dateien:[{name,groesse,geaendert}]} oder {stapel:""}. */
    synchronized JSONObject abholen()throws IOException {
        List<Path> offen=new ArrayList<>();
        try(DirectoryStream<Path> ds=Files.newDirectoryStream(ordner)){for(Path p:ds){String n=p.getFileName().toString();if(n.matches("\\d+-[0-9a-f]{8}")&&Files.isDirectory(p,LinkOption.NOFOLLOW_LINKS))offen.add(p);}}
        if(offen.isEmpty())return new JSONObject().put("stapel","").put("dateien",new JSONArray());
        offen.sort(Comparator.comparing(p->p.getFileName().toString()));
        Path alt=offen.get(0),neu=ordner.resolve(alt.getFileName()+".abgeholt");
        Files.move(alt,neu,StandardCopyOption.ATOMIC_MOVE);
        JSONArray liste=DesktopOrdner.liste(neu),dateien=new JSONArray();
        for(int i=0;i<liste.length();i++){JSONObject e=liste.getJSONObject(i);if("datei".equals(e.optString("art"))){e.remove("art");dateien.put(e);}}
        return new JSONObject().put("stapel",neu.getFileName().toString()).put("dateien",dateien).put("weitere",offen.size()-1);
    }

    synchronized JSONObject lesen(JSONObject o)throws IOException {
        String stapel=o.optString("stapel",""),name=o.optString("name","");
        if(!stapel.matches("\\d+-[0-9a-f]{8}\\.abgeholt")||!DesktopOrdner.nameGueltig(name))throw new IOException("PD_NICHT_GEFUNDEN");
        Path f=ordner.resolve(stapel).resolve(name).normalize();
        if(!f.startsWith(ordner.resolve(stapel))||!Files.isRegularFile(f,LinkOption.NOFOLLOW_LINKS))throw new IOException("PD_NICHT_GEFUNDEN");
        long von=Math.max(0,DesktopFiles.integer(o.opt("offset")));
        int laenge=(int)Math.min(DesktopOrdner.STUECK,Math.max(0,DesktopFiles.integer(o.opt("laenge"))));
        try(FileChannel k=FileChannel.open(f,StandardOpenOption.READ)){
            k.position(von);java.nio.ByteBuffer b=java.nio.ByteBuffer.allocate(laenge);
            while(b.hasRemaining()){if(k.read(b)<0)break;}
            return new JSONObject().put("data",Base64.getEncoder().encodeToString(Arrays.copyOf(b.array(),b.position())));
        }
    }

    /** Abgeholte Stapel nach 14 Tagen und halbe (*.teil, Absturz beim Kopieren) sofort entfernen. */
    void aufraeumen(long jetzt){
        try(DirectoryStream<Path> ds=Files.newDirectoryStream(ordner)){
            for(Path p:ds){
                String n=p.getFileName().toString();
                Long zeit=n.matches("\\d+-[0-9a-f]{8}(\\.abgeholt|\\.teil)")?Long.valueOf(n.substring(0,n.indexOf('-'))):null;
                if(zeit==null)continue;
                if(n.endsWith(".teil")||(n.endsWith(".abgeholt")&&jetzt-zeit>AUFHEBEN))loeschen(p);
            }
        }catch(IOException egal){/* beim nächsten Start */}
    }
    private static void loeschen(Path p){
        try(var w=Files.walk(p)){w.sorted(Comparator.reverseOrder()).forEach(x->{try{Files.deleteIfExists(x);}catch(IOException egal){/* weiter */}});}catch(IOException egal){/* weiter */}
    }
}
