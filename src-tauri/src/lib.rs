use std::net::TcpListener;
use std::io::{Read, Write};
use tauri::{Emitter, Manager};

#[tauri::command]
fn open_system_browser(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&url)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = url;
    }
    Ok(())
}

#[tauri::command]
async fn start_auth_server(app: tauri::AppHandle) -> Result<u16, String> {
    // Try preferred port 28282 first, fallback to random available OS port (0)
    let listener = TcpListener::bind("127.0.0.1:28282")
        .or_else(|_| TcpListener::bind("127.0.0.1:0"))
        .map_err(|e| e.to_string())?;

    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let app_handle = app.clone();

    std::thread::spawn(move || {
        if let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0; 8192];
            if let Ok(size) = stream.read(&mut buffer) {
                let request = String::from_utf8_lossy(&buffer[..size]);
                
                // Extract query string from GET request line
                let mut query = String::new();
                if let Some(first_line) = request.lines().next() {
                    if let Some(start_pos) = first_line.find("/callback?") {
                        let sub = &first_line[start_pos + 10..];
                        if let Some(end_pos) = sub.find(' ') {
                            query = sub[..end_pos].to_string();
                        } else {
                            query = sub.to_string();
                        }
                    }
                }

                let html_body = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>bokra — Successfully Signed In</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            background-color: #000000;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 24px;
            box-sizing: border-box;
            -webkit-font-smoothing: antialiased;
        }
        .card {
            background: #111113;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 32px;
            padding: 48px 36px;
            max-width: 400px;
            text-align: center;
            box-shadow: 0 30px 60px rgba(0, 0, 0, 0.9);
        }
        .logo-box {
            width: 72px;
            height: 72px;
            margin: 0 auto 24px;
            border-radius: 20px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 12px 28px rgba(0,0,0,0.6);
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin: 0 0 10px 0;
            color: #FFFFFF;
        }
        p {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.55);
            line-height: 1.6;
            margin: 0 0 28px 0;
        }
        .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.06);
            color: rgba(255, 255, 255, 0.85);
            padding: 8px 18px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid rgba(255, 255, 255, 0.1);
            letter-spacing: 0.02em;
        }
        .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #22C55E;
            box-shadow: 0 0 8px #22C55E;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="logo-box">
            <svg width="72" height="72" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="24" fill="#1C1C1E"/>
                <circle cx="42" cy="50" r="22" stroke="rgba(255,255,255,0.25)" stroke-width="7"/>
                <circle cx="62" cy="50" r="16" fill="white" filter="drop-shadow(0 0 12px rgba(255,255,255,0.9))"/>
            </svg>
        </div>
        <h1>Successfully Signed In</h1>
        <p>Your account is now linked to bokra for Mac. You can close this tab and return to the application.</p>
        <div class="badge"><span class="dot"></span> Connected</div>
    </div>
</body>
</html>"##;

                let response = format!(
                    "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=UTF-8\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                    html_body.as_bytes().len(),
                    html_body
                );

                let _ = stream.write_all(response.as_bytes());
                let _ = stream.flush();

                // Notify webview with query parameters
                let _ = app_handle.emit("desktop-auth-callback", query);

                // Focus window on macOS
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.set_focus();
                }
            }
        }
    });

    Ok(port)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_system_browser, start_auth_server])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
