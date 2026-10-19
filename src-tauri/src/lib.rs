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

                let html_body = r#"<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="utf-8">
    <title>بُكرة - تم تسجيل الدخول</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            background-color: #000000;
            color: #FFFFFF;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
        }
        .card {
            background: #111113;
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 28px;
            padding: 40px 32px;
            max-width: 420px;
            text-align: center;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
        }
        .icon {
            font-size: 48px;
            margin-bottom: 16px;
        }
        h1 {
            font-size: 24px;
            font-weight: 700;
            margin: 0 0 10px 0;
            color: #34D399;
        }
        p {
            font-size: 14px;
            color: rgba(255, 255, 255, 0.6);
            line-height: 1.6;
            margin: 0 0 24px 0;
        }
        .badge {
            display: inline-block;
            background: rgba(52, 211, 153, 0.1);
            color: #34D399;
            padding: 6px 16px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            border: 1px solid rgba(52, 211, 153, 0.2);
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="icon">🚀</div>
        <h1>تم تسجيل الدخول بنجاح!</h1>
        <p>تم ربط حسابك بتطبيق بُكرة المكتبي بنجاح. يمكنك إغلاق هذا التبويب الآن والعودة إلى التطبيق.</p>
        <div class="badge">جاهز للاستخدام</div>
    </div>
</body>
</html>"#;

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
