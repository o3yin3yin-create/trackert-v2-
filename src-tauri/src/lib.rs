use std::net::TcpListener;
use std::io::{Read, Write};
use std::sync::atomic::{AtomicU16, Ordering};
use std::sync::Mutex;
use std::time::{Instant, Duration};
use tauri::{Emitter, Manager};

static ACTIVE_PORT: AtomicU16 = AtomicU16::new(0);

struct AuthSession {
    state: String,
    created_at: Instant,
}

static PENDING_AUTH: Mutex<Option<AuthSession>> = Mutex::new(None);

fn generate_secure_nonce() -> Result<String, String> {
    let mut bytes = [0u8; 32];
    getrandom::fill(&mut bytes)
        .map_err(|e| format!("Failed to acquire CSPRNG randomness: {}", e))?;
    Ok(bytes.iter().map(|b| format!("{:02x}", b)).collect())
}

fn constant_time_eq(a: &str, b: &str) -> bool {
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    if a_bytes.len() != b_bytes.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a_bytes.iter().zip(b_bytes.iter()) {
        diff |= x ^ y;
    }
    diff == 0
}

fn url_decode(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let bytes = s.as_bytes();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(val) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                result.push(val as char);
                i += 3;
                continue;
            }
        } else if bytes[i] == b'+' {
            result.push(' ');
            i += 1;
            continue;
        }
        result.push(bytes[i] as char);
        i += 1;
    }
    result
}

fn parse_query_params(query: &str) -> std::collections::HashMap<String, String> {
    let mut map = std::collections::HashMap::new();
    for pair in query.split('&') {
        if pair.is_empty() { continue; }
        let mut parts = pair.splitn(2, '=');
        let key = parts.next().unwrap_or("").to_string();
        let val = parts.next().unwrap_or("").to_string();
        map.insert(key, url_decode(&val));
    }
    map
}

#[derive(serde::Serialize, Clone, Debug, PartialEq, Eq)]
pub struct DesktopAuthPayload {
    pub token: Option<String>,
    pub user: Option<String>,
    pub spotify_token: Option<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum CallbackResult {
    Success(DesktopAuthPayload),
    Forbidden(String),
}

pub fn process_callback_query_at(query: &str, now: Instant) -> CallbackResult {
    let params = parse_query_params(query);
    let received_state = params.get("state").cloned().unwrap_or_default();
    let token = params.get("token").cloned();
    let user = params.get("user").cloned();
    let spotify_token = params.get("spotify_token").cloned();

    let mut state_valid = false;
    if let Ok(mut lock) = PENDING_AUTH.lock() {
        if let Some(session) = lock.take() {
            if now.saturating_duration_since(session.created_at) <= Duration::from_secs(300) {
                if !received_state.is_empty() && constant_time_eq(&received_state, &session.state) {
                    state_valid = true;
                }
            }
        }
    }

    if token.is_some() && !state_valid {
        return CallbackResult::Forbidden("State nonce missing, invalid, or expired".to_string());
    }

    CallbackResult::Success(DesktopAuthPayload {
        token,
        user,
        spotify_token,
    })
}

pub fn process_callback_query(query: &str) -> CallbackResult {
    process_callback_query_at(query, Instant::now())
}

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

fn run_auth_server(app_handle: tauri::AppHandle) -> u16 {
    let current = ACTIVE_PORT.load(Ordering::SeqCst);
    if current != 0 {
        return current;
    }

    let listener = match TcpListener::bind("127.0.0.1:28282") {
        Ok(l) => l,
        Err(_) => match TcpListener::bind("127.0.0.1:0") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("[bokra auth server error] Failed to bind: {}", e);
                return 0;
            }
        }
    };

    let port = match listener.local_addr() {
        Ok(addr) => addr.port(),
        Err(_) => 28282,
    };

    ACTIVE_PORT.store(port, Ordering::SeqCst);

    std::thread::spawn(move || {
        while let Ok((mut stream, _)) = listener.accept() {
            let mut buffer = [0; 8192];
            if let Ok(size) = stream.read(&mut buffer) {
                let request = String::from_utf8_lossy(&buffer[..size]);
                
                // Extract query string from GET request line
                let mut query = String::new();
                let mut has_callback = false;
                if let Some(first_line) = request.lines().next() {
                    if let Some(start_pos) = first_line.find("/callback?") {
                        has_callback = true;
                        let sub = &first_line[start_pos + 10..];
                        if let Some(end_pos) = sub.find(' ') {
                            query = sub[..end_pos].to_string();
                        } else {
                            query = sub.to_string();
                        }
                    } else if first_line.contains("/callback") {
                        has_callback = true;
                    }
                }

                if !has_callback {
                    continue;
                }

                let callback_result = process_callback_query(&query);
                let payload = match callback_result {
                    CallbackResult::Forbidden(_) => {
                        let err_html = r#"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>bokra — Verification Failed</title>
    <style>
        body { background: #000; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .card { background: #111; border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; padding: 32px; max-width: 380px; text-align: center; }
        h1 { font-size: 20px; color: #EF4444; margin-bottom: 8px; }
        p { font-size: 13px; color: rgba(255,255,255,0.6); line-height: 1.5; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Authentication Rejected</h1>
        <p>Security validation failed: The state nonce was missing, mismatched, or expired. Please initiate authentication again from the desktop app.</p>
    </div>
</body>
</html>"#;
                        let response = format!(
                            "HTTP/1.1 403 Forbidden\r\nContent-Type: text/html; charset=UTF-8\r\nConnection: close\r\nContent-Length: {}\r\n\r\n{}",
                            err_html.as_bytes().len(),
                            err_html
                        );
                        let _ = stream.write_all(response.as_bytes());
                        let _ = stream.flush();
                        continue;
                    }
                    CallbackResult::Success(p) => p,
                };

                let html_body = r##"<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>bokra — Successfully Connected</title>
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
        <h1>Successfully Connected</h1>
        <p>Your connection to bokra for Mac was successful. You can close this tab and return to the application.</p>
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

                // Safe dispatch without script interpolation: Emit structured serde payload
                let _ = app_handle.emit("desktop-auth-callback", &payload);

                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.emit("desktop-auth-callback", &payload);
                    let _ = window.set_focus();
                }
            }
        }
    });

    port
}

#[derive(serde::Serialize)]
struct AuthServerInfo {
    port: u16,
    state: String,
}

#[tauri::command]
async fn start_auth_server(app: tauri::AppHandle) -> Result<AuthServerInfo, String> {
    let state = generate_secure_nonce()?;
    let port = run_auth_server(app);
    if port == 0 {
        Err("Failed to start auth server".into())
    } else {
        if let Ok(mut lock) = PENDING_AUTH.lock() {
            *lock = Some(AuthSession {
                state: state.clone(),
                created_at: Instant::now(),
            });
        }
        Ok(AuthServerInfo { port, state })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![open_system_browser, start_auth_server])
    .setup(|app| {
      let app_handle = app.handle().clone();
      run_auth_server(app_handle);

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

#[cfg(test)]
mod tests {
    use super::*;

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn set_test_pending_state(state: &str, age_secs: u64) {
        let mut lock = PENDING_AUTH.lock().unwrap();
        *lock = Some(AuthSession {
            state: state.to_string(),
            created_at: Instant::now() - Duration::from_secs(age_secs),
        });
    }

    #[test]
    fn test_valid_state_accepted_once() {
        let _guard = TEST_LOCK.lock().unwrap();
        let test_state = "valid_state_nonce_1234567890abcdef";
        set_test_pending_state(test_state, 10);

        let query = format!("state={}&token=jwt_test_token_ok&user=alice", test_state);
        let res = process_callback_query(&query);

        match res {
            CallbackResult::Success(payload) => {
                assert_eq!(payload.token.as_deref(), Some("jwt_test_token_ok"));
                assert_eq!(payload.user.as_deref(), Some("alice"));
            }
            CallbackResult::Forbidden(err) => panic!("Expected success, got forbidden: {}", err),
        }
    }

    #[test]
    fn test_same_state_replayed_rejected_403() {
        let _guard = TEST_LOCK.lock().unwrap();
        let test_state = "replay_nonce_abc123";
        set_test_pending_state(test_state, 5);

        let query = format!("state={}&token=jwt_test_token_replay", test_state);
        // First attempt succeeds and consumes the state
        let res1 = process_callback_query(&query);
        assert!(matches!(res1, CallbackResult::Success(_)));

        // Replay of the exact same state MUST fail with 403 Forbidden
        let res2 = process_callback_query(&query);
        assert!(matches!(res2, CallbackResult::Forbidden(_)));
    }

    #[test]
    fn test_wrong_state_rejected_403() {
        let _guard = TEST_LOCK.lock().unwrap();
        set_test_pending_state("expected_secret_state", 10);

        let query = "state=wrong_attacker_state&token=jwt_attacker_token";
        let res = process_callback_query(query);
        assert!(matches!(res, CallbackResult::Forbidden(_)));
    }

    #[test]
    fn test_missing_state_rejected_403() {
        let _guard = TEST_LOCK.lock().unwrap();
        set_test_pending_state("expected_secret_state", 10);

        let query = "token=jwt_token_without_state";
        let res = process_callback_query(query);
        assert!(matches!(res, CallbackResult::Forbidden(_)));
    }

    #[test]
    fn test_expired_state_rejected_403() {
        let _guard = TEST_LOCK.lock().unwrap();
        let test_state = "expired_state_nonce";
        // Created 301 seconds ago (exceeds 300-second TTL)
        set_test_pending_state(test_state, 301);

        let query = format!("state={}&token=jwt_expired_test", test_state);
        let res = process_callback_query(&query);
        assert!(matches!(res, CallbackResult::Forbidden(_)));
    }

    #[test]
    fn test_token_with_script_characters_safe() {
        let _guard = TEST_LOCK.lock().unwrap();
        let test_state = "script_test_state";
        set_test_pending_state(test_state, 10);

        let malicious_token = "malicious\"';<script>alert(1)</script>";
        // URL-encoded: "malicious%22'%3B%3Cscript%3Ealert(1)%3C%2Fscript%3E"
        let query = format!(
            "state={}&token=malicious%22'%3B%3Cscript%3Ealert(1)%3C%2Fscript%3E&user=bob",
            test_state
        );

        let res = process_callback_query(&query);
        match res {
            CallbackResult::Success(payload) => {
                // Token is parsed as a plain data string without execution
                assert_eq!(payload.token.as_deref(), Some(malicious_token));
                // Serialization to JSON properly escapes quotes and avoids script injection
                let json = serde_json::to_string(&payload).expect("Failed to serialize");
                assert!(json.contains(r#"malicious\"';<script>alert(1)</script>"#));
            }
            CallbackResult::Forbidden(err) => panic!("Expected success, got: {}", err),
        }
    }
}
