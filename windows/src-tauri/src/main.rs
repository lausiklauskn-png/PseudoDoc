#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
//! PseudoDoc Pro für Windows: Tauri 2 / WebView2 mit derselben Oberfläche wie die Android-App (Vorbild BookLedgerPro).
mod engine;
mod host;
mod win;
use host::Host;
use serde_json::Value;
use std::sync::{Arc,atomic::Ordering};
use tauri::{Manager,WebviewWindow,WebviewUrl,WebviewWindowBuilder};

fn eigene_seite(url:&tauri::Url)->bool{url.scheme()=="https"&&url.host_str()==Some("tauri.localhost")}

#[tauri::command]
async fn do_call(window:WebviewWindow,host:tauri::State<'_,Arc<Host>>,request:tauri::ipc::Request<'_>,plugin:String,method:String,options:Value)->Result<Value,String>{
    let url=window.url().map_err(|_|"NOT_ALLOWED")?;
    if !host.authorized(&request)||window.label()!="main"||!eigene_seite(&url)||!["/","/index.html"].contains(&url.path()){return Err("NOT_ALLOWED".into());}
    let allowed:Value=serde_json::from_str(include_str!("../../bridge/contracts.json")).map_err(|_|"APP_CONFIGURATION_INVALID")?;
    if !allowed.get(&plugin).and_then(Value::as_array).is_some_and(|methods|methods.iter().any(|m|m.as_str()==Some(&method))){return Err("NOT_ALLOWED".into());}
    let host=host.inner().clone();tauri::async_runtime::spawn_blocking(move||host.call(&plugin,&method,options)).await.map_err(|_|"APP_RUNTIME_UNAVAILABLE".to_string())?
}
fn main(){
    let result=tauri::Builder::default().plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app,arguments,cwd|{
            if let Some(window)=app.get_webview_window("main"){let _=window.unminimize();let _=window.set_focus();}
            if let Some(host)=app.try_state::<Arc<Host>>(){let host=host.inner().clone();std::thread::spawn(move||host.receive(arguments,Some(cwd)));}
        }))
        .invoke_handler(tauri::generate_handler![do_call])
        .setup(|app|{
            let host=Host::new(app.handle().clone()).map_err(std::io::Error::other)?;host.start().map_err(std::io::Error::other)?;app.manage(host.clone());
            WebviewWindowBuilder::new(app,"main",WebviewUrl::App("index.html".into()))
                .title("PseudoDoc Pro").inner_size(1280.,860.).min_inner_size(360.,480.).use_https_scheme(true)
                // Hineinziehen bleibt bei der Seite (Block „Dateien einfügen per Drag and Drop“), nicht bei der Hülle.
                .devtools(cfg!(feature="messprobe")).disable_drag_drop_handler()
                .additional_browser_args(host::BROWSER_ARGS)
                .initialization_script(include_str!("../../bridge/capacitor-tauri.js").replace("__DO_SESSION_TOKEN__",&serde_json::to_string(&host.session).unwrap()))
                // Eigene Seiten bleiben im Fenster; Adressen nach draußen gehen an den Browser bzw. das Mailprogramm, nie in dieses Fenster.
                .on_navigation(|url|{
                    if eigene_seite(url){return ["/","/index.html","/landkarte.html"].contains(&url.path());}
                    if ["https","http","mailto"].contains(&url.scheme())&&url.username().is_empty()&&url.password().is_none(){let _=win::open(url.as_str());}
                    false
                })
                .on_new_window(|url,_|{
                    if ["https","http","mailto"].contains(&url.scheme())&&!eigene_seite(&url)&&url.username().is_empty()&&url.password().is_none(){let _=win::open(url.as_str());}
                    tauri::webview::NewWindowResponse::Deny
                })
                .build()?;
            let arguments=std::env::args().collect();std::thread::spawn(move||host.receive(arguments,None));Ok(())
        })
        .on_window_event(|window,event|{
            let Some(host)=window.app_handle().try_state::<Arc<Host>>() else {return};
            if let tauri::WindowEvent::Destroyed=event {
                if window.label()=="main"{host.closing.store(true,Ordering::SeqCst);host.shutdown();window.app_handle().exit(0);}
            }
        }).run(tauri::generate_context!());
    if result.is_err(){win::startup_error();std::process::exit(1);}
}
