use bollard::Docker;
use bollard::query_parameters::{
    ListContainersOptions, StartContainerOptions, RemoveContainerOptions,
    ListImagesOptions, ListVolumesOptions, RemoveImageOptions, CreateImageOptions,
    LogsOptionsBuilder,
    ListNetworksOptionsBuilder, InspectNetworkOptionsBuilder,
    RemoveVolumeOptionsBuilder, PruneVolumesOptionsBuilder,
};
use bollard::exec::{CreateExecOptions, StartExecOptions, StartExecResults};
use bollard::models::NetworkCreateRequest;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use futures_util::StreamExt;
use std::sync::{Arc, Mutex};
use tokio::sync::mpsc;
use dashmap::DashMap;
use tauri::{State, Manager};
use chrono::Local;

// ── Configuration ────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DockerConfig {
    pub docker_host: String,
}

impl Default for DockerConfig {
    fn default() -> Self {
        Self {
            docker_host: "unix:///var/run/docker.sock".to_string(),
        }
    }
}

pub struct AppState {
    pub config: Mutex<DockerConfig>,
    pub config_path: std::path::PathBuf,
    pub terminal_sessions: Arc<DashMap<String, mpsc::Sender<Vec<u8>>>>,
}

impl AppState {
    fn load(path: std::path::PathBuf) -> Self {
        let config = if path.exists() {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            DockerConfig::default()
        };
        Self {
            config: Mutex::new(config),
            config_path: path,
            terminal_sessions: Arc::new(DashMap::new()),
        }
    }

    fn save(&self) -> Result<(), String> {
        let config = self.config.lock().unwrap();
        let json = serde_json::to_string_pretty(&*config).map_err(|e| e.to_string())?;
        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        std::fs::write(&self.config_path, json).map_err(|e| e.to_string())
    }
}

/// Find the docker CLI binary path across platforms.
/// Bundled apps don't inherit the user's shell PATH, so we search common locations.
fn get_docker_cli_path() -> String {
    #[cfg(unix)]
    {
        let common_paths = [
            "/usr/local/bin/docker",
            "/usr/bin/docker",
            "/opt/homebrew/bin/docker",
            "/Applications/Docker.app/Contents/Resources/bin/docker",
        ];
        for p in &common_paths {
            if std::path::Path::new(p).exists() {
                return p.to_string();
            }
        }
    }
    #[cfg(windows)]
    {
        let common_paths = [
            r"C:\Program Files\Docker\Docker\resources\bin\docker.exe",
            r"C:\ProgramData\DockerDesktop\version-bin\docker.exe",
        ];
        for p in &common_paths {
            if std::path::Path::new(p).exists() {
                return p.to_string();
            }
        }
    }
    // Fallback: hope it's on PATH (works in dev mode and most setups)
    "docker".to_string()
}

fn get_docker(state: State<AppState>) -> Result<Docker, String> {
    let host = state.config.lock().unwrap().docker_host.clone();
    if host.is_empty() {
        return Docker::connect_with_local_defaults().map_err(|e: bollard::errors::Error| e.to_string());
    }
    
    if host.starts_with("unix://") {
        #[cfg(unix)]
        {
            Docker::connect_with_unix(&host[7..], 120, bollard::API_DEFAULT_VERSION)
                .map_err(|e: bollard::errors::Error| e.to_string())
        }
        #[cfg(not(unix))]
        {
            Err("Unix sockets are not supported on this platform".to_string())
        }
    } else if host.starts_with("npipe://") {
        #[cfg(target_os = "windows")]
        {
            Docker::connect_with_named_pipe(&host[8..], 120, bollard::API_DEFAULT_VERSION)
                .map_err(|e: bollard::errors::Error| e.to_string())
        }
        #[cfg(not(target_os = "windows"))]
        {
            Err("Named pipes are only supported on Windows".to_string())
        }
    } else if host.starts_with("http://") || host.starts_with("https://") || host.starts_with("tcp://") {
        let url = if host.starts_with("tcp://") {
            host.replace("tcp://", "http://")
        } else {
            host
        };
        Docker::connect_with_http(&url, 120, bollard::API_DEFAULT_VERSION)
            .map_err(|e: bollard::errors::Error| e.to_string())
    } else {
        // Assume it might be just a path for unix socket or named pipe
        #[cfg(unix)]
        {
            if host.starts_with('/') {
                Docker::connect_with_unix(&host, 120, bollard::API_DEFAULT_VERSION)
                    .map_err(|e: bollard::errors::Error| e.to_string())
            } else {
                Docker::connect_with_local_defaults().map_err(|e: bollard::errors::Error| e.to_string())
            }
        }
        #[cfg(not(unix))]
        {
            Docker::connect_with_local_defaults().map_err(|e: bollard::errors::Error| e.to_string())
        }
    }
}

#[tauri::command]
async fn get_docker_config(state: State<'_, AppState>) -> Result<DockerConfig, String> {
    Ok(state.config.lock().unwrap().clone())
}

#[tauri::command]
async fn update_docker_config(state: State<'_, AppState>, config: DockerConfig) -> Result<(), String> {
    let old_host = {
        let current = state.config.lock().unwrap();
        current.docker_host.clone()
    };
    
    {
        let mut current = state.config.lock().unwrap();
        current.docker_host = config.docker_host.clone();
    }
    
    match get_docker(state.clone()) {
        Ok(docker) => {
            if let Err(e) = docker.info().await {
                let mut current = state.config.lock().unwrap();
                current.docker_host = old_host;
                return Err(format!("Failed to connect to Docker with new settings: {}", e));
            }
            // If connection works, save to file
            state.save()?;
            Ok(())
        }
        Err(e) => {
            let mut current = state.config.lock().unwrap();
            current.docker_host = old_host;
            Err(e)
        }
    }
}

// ── Docker Info ──────────────────────────────────────────

#[tauri::command]
async fn get_docker_info(state: State<'_, AppState>) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let info = docker.info().await.map_err(|e| e.to_string())?;
    serde_json::to_value(info).map_err(|e| e.to_string())
}

// ── Containers ───────────────────────────────────────────

#[tauri::command]
async fn list_containers(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    let docker = get_docker(state)?;
    let options = Some(ListContainersOptions { all: true, ..Default::default() });
    let containers = docker.list_containers(options).await.map_err(|e| e.to_string())?;
    let json = serde_json::to_value(containers).map_err(|e| e.to_string())?;
    Ok(json.as_array().unwrap_or(&vec![]).clone())
}

#[tauri::command]
async fn inspect_container(state: State<'_, AppState>, id: String) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let info = docker.inspect_container(&id, None).await.map_err(|e| e.to_string())?;
    serde_json::to_value(info).map_err(|e| e.to_string())
}

#[tauri::command]
async fn container_logs(state: State<'_, AppState>, id: String, tail: Option<String>) -> Result<String, String> {
    let docker = get_docker(state)?;
    let options = LogsOptionsBuilder::default()
        .stdout(true)
        .stderr(true)
        .tail(&tail.unwrap_or_else(|| "200".to_string()))
        .build();
    let mut stream = docker.logs(&id, Some(options));
    let mut output = String::new();
    while let Some(result) = stream.next().await {
        match result {
            Ok(log) => output.push_str(&log.to_string()),
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(output)
}

#[tauri::command]
async fn stream_container_logs(app: tauri::AppHandle, state: State<'_, AppState>, id: String) -> Result<(), String> {
    use tauri::Emitter;
    let docker = get_docker(state)?;
    let options = LogsOptionsBuilder::default()
        .stdout(true)
        .stderr(true)
        .follow(true)
        .tail("100")
        .build();
    let mut stream = docker.logs(&id, Some(options));
    
    tauri::async_runtime::spawn(async move {
        while let Some(result) = stream.next().await {
            match result {
                Ok(log) => {
                    let _ = app.emit("container-log-line", log.to_string());
                }
                Err(_) => break,
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
async fn start_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.start_container(id, None::<StartContainerOptions>).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn stop_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.stop_container(id, None).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn restart_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.restart_container(id, None).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn pause_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.pause_container(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn unpause_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.unpause_container(id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_container(state: State<'_, AppState>, id: &str) -> Result<(), String> {
    let docker = get_docker(state)?;
    let options = Some(RemoveContainerOptions { force: true, v: false, link: false });
    docker.remove_container(id, options).await.map_err(|e| e.to_string())
}

// ── Terminal ─────────────────────────────────────────────

#[tauri::command]
async fn start_terminal(app: tauri::AppHandle, state: State<'_, AppState>, container_id: String, cols: u16, rows: u16) -> Result<String, String> {
    use tauri::Emitter;
    let docker = get_docker(state.clone())?;
    
    // 1. Create Exec
    let config = CreateExecOptions {
        attach_stdout: Some(true),
        attach_stderr: Some(true),
        attach_stdin: Some(true),
        tty: Some(true),
        cmd: Some(vec!["/bin/sh"]),
        env: Some(vec!["TERM=xterm"]),
        ..Default::default()
    };
    
    let exec = docker.create_exec(&container_id, config).await.map_err(|e| e.to_string())?;
    
    // 2. Start Exec
    let start_config = StartExecOptions {
        detach: false,
        ..Default::default()
    };
    
    let res = docker.start_exec(&exec.id, Some(start_config)).await.map_err(|e| e.to_string())?;

    // 3. Handle streams
    if let StartExecResults::Attached { mut output, mut input } = res {
        // Resize initially
        let resize_opt = bollard::exec::ResizeExecOptions {
            height: rows,
            width: cols,
        };
        let _ = docker.resize_exec(&exec.id, resize_opt).await;

        let exec_id_clone = exec.id.clone();
        let emit_topic = format!("terminal-output-{}", container_id);

        // Tokio Task to continuously read output from Docker and emit to frontend
        tokio::spawn(async move {
            while let Some(msg) = output.next().await {
                match msg {
                    Ok(log_output) => {
                        let bytes = log_output.into_bytes().to_vec();
                        let _ = app.emit(&emit_topic, bytes);
                    }
                    Err(e) => {
                        eprintln!("Error reading exec output: {}", e);
                        break;
                    }
                }
            }
            // Cleanup on exit
        });

        // Set up an mpsc channel to receive input from the frontend
        let (tx, mut rx) = mpsc::channel::<Vec<u8>>(100);
        
        // Save sender to app state
        state.terminal_sessions.insert(exec.id.clone(), tx);

        // Tokio Task to read from channel and write to docker stdin
        tokio::spawn(async move {
            use tokio::io::AsyncWriteExt;
            while let Some(data) = rx.recv().await {
                if let Err(e) = input.write_all(&data).await {
                    eprintln!("Error writing to exec stdin: {}", e);
                    break;
                }
            }
        });

        Ok(exec_id_clone)
    } else {
        Err("Failed to attach to container exec".to_string())
    }
}

#[tauri::command]
async fn write_terminal(state: State<'_, AppState>, exec_id: String, data: Vec<u8>) -> Result<(), String> {
    if let Some(tx) = state.terminal_sessions.get(&exec_id) {
        tx.send(data).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Session not found".to_string())
    }
}

#[tauri::command]
async fn resize_terminal(state: State<'_, AppState>, exec_id: String, cols: u16, rows: u16) -> Result<(), String> {
    let docker = get_docker(state)?;
    let resize_opt = bollard::exec::ResizeExecOptions {
        height: rows,
        width: cols,
    };
    docker.resize_exec(&exec_id, resize_opt).await.map_err(|e| e.to_string())
}

// ── Images ───────────────────────────────────────────────

#[tauri::command]
async fn list_images(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    let docker = get_docker(state)?;
    let options = Some(ListImagesOptions { all: true, ..Default::default() });
    let images = docker.list_images(options).await.map_err(|e| e.to_string())?;
    let json = serde_json::to_value(images).map_err(|e| e.to_string())?;
    Ok(json.as_array().unwrap_or(&vec![]).clone())
}

#[tauri::command]
async fn inspect_image(state: State<'_, AppState>, id: String) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let info = docker.inspect_image(&id).await.map_err(|e| e.to_string())?;
    serde_json::to_value(info).map_err(|e| e.to_string())
}

#[tauri::command]
async fn pull_image(app: tauri::AppHandle, state: State<'_, AppState>, name: String) -> Result<(), String> {
    use tauri::Emitter;
    let docker = get_docker(state)?;
    let (image, tag) = if name.contains(':') {
        let parts: Vec<&str> = name.splitn(2, ':').collect();
        (parts[0].to_string(), parts[1].to_string())
    } else {
        (name.clone(), "latest".to_string())
    };
    let options = Some(CreateImageOptions {
        from_image: Some(image),
        tag: Some(tag),
        ..Default::default()
    });
    let mut stream = docker.create_image(options, None, None);
    while let Some(result) = stream.next().await {
        match result {
            Ok(info) => {
                if let Some(err) = &info.error_detail {
                    if let Some(msg) = &err.message {
                        return Err(msg.clone());
                    }
                }
                let mut msg = String::new();
                if let Some(id) = &info.id {
                    msg.push_str(&format!("{}: ", id));
                }
                if let Some(status) = &info.status {
                    msg.push_str(status);
                }
                if let Some(prog) = &info.progress_detail {
                    if let (Some(cur), Some(tot)) = (prog.current, prog.total) {
                        let cur_mb = cur as f64 / 1_048_576.0;
                        let tot_mb = tot as f64 / 1_048_576.0;
                        msg.push_str(&format!(" ({:.1}MB / {:.1}MB)", cur_mb, tot_mb));
                    }
                }
                if !msg.is_empty() {
                    let _ = app.emit("pull-progress", msg);
                }
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    Ok(())
}

#[tauri::command]
async fn remove_image(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let docker = get_docker(state)?;
    let options = Some(RemoveImageOptions { force: true, ..Default::default() });
    docker.remove_image(&id, options, None).await.map_err(|e| e.to_string())?;
    Ok(())
}

// ── Volumes ──────────────────────────────────────────────

#[tauri::command]
async fn list_volumes(state: State<'_, AppState>) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let options = Some(ListVolumesOptions { ..Default::default() });
    let volumes = docker.list_volumes(options).await.map_err(|e| e.to_string())?;
    serde_json::to_value(volumes).map_err(|e| e.to_string())
}

#[tauri::command]
async fn inspect_volume(state: State<'_, AppState>, name: String) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let vol = docker.inspect_volume(&name).await.map_err(|e| e.to_string())?;
    serde_json::to_value(vol).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_volume(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let docker = get_docker(state)?;
    let options = RemoveVolumeOptionsBuilder::default().force(true).build();
    docker.remove_volume(&name, Some(options)).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn prune_volumes(state: State<'_, AppState>) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let options = PruneVolumesOptionsBuilder::default().build();
    let result = docker.prune_volumes(Some(options)).await.map_err(|e| e.to_string())?;
    serde_json::to_value(result).map_err(|e| e.to_string())
}

// ── Networks ─────────────────────────────────────────────

#[tauri::command]
async fn list_networks(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    let docker = get_docker(state)?;
    let options = ListNetworksOptionsBuilder::default().build();
    let networks = docker.list_networks(Some(options)).await.map_err(|e| e.to_string())?;
    let json = serde_json::to_value(networks).map_err(|e| e.to_string())?;
    Ok(json.as_array().unwrap_or(&vec![]).clone())
}

#[tauri::command]
async fn inspect_network(state: State<'_, AppState>, id: String) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let options = InspectNetworkOptionsBuilder::default().verbose(true).build();
    let net = docker.inspect_network(&id, Some(options)).await.map_err(|e| e.to_string())?;
    serde_json::to_value(net).map_err(|e| e.to_string())
}

#[tauri::command]
async fn remove_network(state: State<'_, AppState>, id: String) -> Result<(), String> {
    let docker = get_docker(state)?;
    docker.remove_network(&id).await.map_err(|e| e.to_string())
}

#[tauri::command]
async fn create_network(state: State<'_, AppState>, name: String, driver: Option<String>) -> Result<Value, String> {
    let docker = get_docker(state)?;
    let config = NetworkCreateRequest {
        name,
        driver: Some(driver.unwrap_or_else(|| "bridge".to_string())),
        ..Default::default()
    };
    let result = docker.create_network(config).await.map_err(|e| e.to_string())?;
    serde_json::to_value(result).map_err(|e| e.to_string())
}

#[tauri::command]
async fn launch_compose(app: tauri::AppHandle, state: State<'_, AppState>, yaml: String, project_name: String, working_dir: Option<String>, force_build: Option<bool>) -> Result<String, String> {
    use std::io::Write;
    use tokio::io::{AsyncBufReadExt, BufReader};
    use std::process::Stdio;
    use tauri::Emitter;

    let tmp_dir = std::env::temp_dir().join("wdocker_templates");
    std::fs::create_dir_all(&tmp_dir).map_err(|e| e.to_string())?;
    let file_path = tmp_dir.join(format!("{}.yml", project_name));
    let mut file = std::fs::File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(yaml.as_bytes()).map_err(|e| e.to_string())?;

    let host = state.config.lock().unwrap().docker_host.clone();

    let mut cmd = tokio::process::Command::new(&get_docker_cli_path());
    
    // 2. Setup Log file path
    let safe_pname = project_name.strip_prefix("wdp-").unwrap_or(&project_name);
    let home = std::env::var("HOME").unwrap_or_default();
    let log_dir = std::path::Path::new(&home).join(".wDocker/logs").join(safe_pname);
    let _ = std::fs::create_dir_all(&log_dir);
    
    let now = Local::now();
    let log_filename = format!("deploy_{}.log", now.format("%Y%m%d_%H%M%S"));
    let log_file_path = log_dir.join(&log_filename);
    let _ = std::fs::File::create(&log_file_path);

    let mut args = vec!["compose", "-f", file_path.to_str().unwrap(), "-p", &project_name, "up", "-d"];
    if force_build.unwrap_or(false) {
        args.push("--build");
        args.push("--force-recreate");
    }
    cmd.args(&args);
    
    // If working_dir is provided, use it (crucial for build contexts)
    if let Some(wd) = working_dir {
        let expanded_wd = wd.replace("~", &std::env::var("HOME").unwrap_or_default());
        cmd.current_dir(expanded_wd);
    }

    if !host.is_empty() {
        cmd.env("DOCKER_HOST", host);
    }

    // Ensure PATH includes common binary locations for credential helpers
    let current_path = std::env::var("PATH").unwrap_or_default();
    cmd.env("PATH", format!("/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:{}", current_path));

    cmd.stdout(Stdio::piped());
    cmd.stderr(Stdio::piped());

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let app_clone1 = app.clone();
    let log_path1 = log_file_path.clone();
    let mut stdout_reader = BufReader::new(stdout).lines();
    tokio::spawn(async move {
        use std::fs::OpenOptions;
        let mut f = OpenOptions::new().append(true).open(log_path1).ok();
        while let Ok(Some(line)) = stdout_reader.next_line().await {
            let _ = app_clone1.emit("compose-progress", line.clone());
            if let Some(ref mut file) = f { let _ = writeln!(file, "{}", line); }
        }
    });

    let app_clone2 = app.clone();
    let log_path2 = log_file_path.clone();
    let mut stderr_reader = BufReader::new(stderr).lines();
    tokio::spawn(async move {
        use std::fs::OpenOptions;
        let mut f = OpenOptions::new().append(true).open(log_path2).ok();
        while let Ok(Some(line)) = stderr_reader.next_line().await {
            let _ = app_clone2.emit("compose-progress", line.clone());
            if let Some(ref mut file) = f { let _ = writeln!(file, "{}", line); }
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;

    if status.success() {
        Ok(log_filename)
    } else {
        Err(format!("Docker Compose failed. Details in {}", log_filename))
    }
}

#[tauri::command]
async fn get_system_df(state: State<'_, AppState>) -> Result<Vec<Value>, String> {
    let host = state.config.lock().unwrap().docker_host.clone();
    let mut cmd = tokio::process::Command::new(&get_docker_cli_path());
    cmd.args(["system", "df", "--format", "{{json .}}"]);
    if !host.is_empty() {
        cmd.env("DOCKER_HOST", host);
    }
    let output = cmd.output().await.map_err(|e| e.to_string())?;
    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();
    for line in stdout.lines() {
        if let Ok(v) = serde_json::from_str::<Value>(line) {
            results.push(v);
        }
    }
    Ok(results)
}

#[tauri::command]
async fn execute_prune(state: State<'_, AppState>, target: String) -> Result<String, String> {
    let host = state.config.lock().unwrap().docker_host.clone();
    let mut cmd = tokio::process::Command::new(&get_docker_cli_path());
    
    match target.as_str() {
        "all" => cmd.args(["system", "prune", "-f"]), // Removed --volumes and -a to make it much safer for local dev
        "containers" => cmd.args(["container", "prune", "-f"]),
        "images" => cmd.args(["image", "prune", "-f"]), // Removed -a to only remove dangling images
        "volumes" => cmd.args(["volume", "prune", "-f"]),
        "networks" => cmd.args(["network", "prune", "-f"]),
        "build_cache" => cmd.args(["builder", "prune", "-f"]),
        _ => return Err("Invalid prune target".to_string()),
    };

    if !host.is_empty() {
        cmd.env("DOCKER_HOST", host);
    }

    let output = cmd.output().await.map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

// ── DNS Manager ──────────────────────────────────────────

#[tauri::command]
async fn read_hosts_file() -> Result<String, String> {
    #[cfg(unix)]
    let path = "/etc/hosts";
    #[cfg(windows)]
    let path = r"C:\Windows\System32\drivers\etc\hosts";
    
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
async fn write_hosts_file(content: String) -> Result<String, String> {
    #[cfg(unix)]
    let host_path = "/etc/hosts";
    #[cfg(windows)]
    let host_path = r"C:\Windows\System32\drivers\etc\hosts";

    let temp_path = std::env::temp_dir().join("wdocker_hosts_tmp");
    std::fs::write(&temp_path, &content).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        let script = format!(
            "do shell script \"cp {} {}\" with administrator privileges", 
            temp_path.to_string_lossy(), host_path
        );
        let status = std::process::Command::new("osascript")
            .arg("-e").arg(&script)
            .status().map_err(|e| e.to_string())?;
        if status.success() { Ok("Success".to_string()) } else { Err("Failed to execute with admin privileges".to_string()) }
    }
    
    #[cfg(target_os = "linux")]
    {
        let status = std::process::Command::new("pkexec")
            .arg("cp").arg(&temp_path).arg(host_path)
            .status().map_err(|e| e.to_string())?;
         if status.success() { Ok("Success".to_string()) } else { Err("Failed to execute with admin privileges".to_string()) }
    }
    
    #[cfg(target_os = "windows")]
    {
        let cmd = format!("Copy-Item -Path '{}' -Destination '{}' -Force", temp_path.to_string_lossy(), host_path);
        let status = std::process::Command::new("powershell")
            .args(&["-Command", &format!("Start-Process powershell -ArgumentList '-Command \"{}\"' -Verb RunAs -WindowStyle Hidden", cmd)])
            .status().map_err(|e| e.to_string())?;
        if status.success() { Ok("Success".to_string()) } else { Err("Failed to execute with admin privileges".to_string()) }
    }
}

// ── Project Files Manager ──────────────────────────────────

#[tauri::command]
async fn save_router_config(project_name: String, content: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/router_conf");
    std::fs::create_dir_all(&base).map_err(|e| e.to_string())?;
    let file_path = base.join(format!("{}.conf", project_name));
    std::fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    Ok(format!("Saved {}", file_path.display()))
}

#[tauri::command]
async fn read_router_config(project_name: String) -> Result<String, String> {
    let file_path = expand_tilde("~/.wDocker/router_conf").join(format!("{}.conf", project_name));
    if file_path.exists() {
        std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
    } else {
        Err("Router configuration not found".to_string())
    }
}

#[tauri::command]
async fn list_router_configs() -> Result<Vec<String>, String> {
    let base = expand_tilde("~/.wDocker/router_conf");
    if !base.exists() {
        return Ok(vec![]);
    }
    let entries = std::fs::read_dir(base).map_err(|e| e.to_string())?;
    let mut files = Vec::new();
    for entry in entries.flatten() {
        if let Some(name) = entry.file_name().to_str() {
            if name.ends_with(".conf") || name.ends_with(".conf.disabled") {
                files.push(name.to_string());
            }
        }
    }
    Ok(files)
}

#[tauri::command]
async fn remove_router_config(project_name: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/router_conf");
    let conf_path = base.join(format!("{}.conf", project_name));
    let disabled_path = base.join(format!("{}.conf.disabled", project_name));
    if conf_path.exists() {
        std::fs::remove_file(&conf_path).map_err(|e| e.to_string())?;
    }
    if disabled_path.exists() {
        std::fs::remove_file(&disabled_path).map_err(|e| e.to_string())?;
    }
    Ok(format!("Removed router config for {}", project_name))
}

#[tauri::command]
async fn toggle_router_config(file_name: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/router_conf");
    let file_path = base.join(&file_name);
    if !file_path.exists() {
        return Err(format!("File {} not found", file_name));
    }
    let new_name = if file_name.ends_with(".conf.disabled") {
        file_name.replace(".conf.disabled", ".conf")
    } else if file_name.ends_with(".conf") {
        format!("{}.disabled", file_name)
    } else {
        return Err("Invalid file extension".to_string());
    };
    let new_path = base.join(&new_name);
    std::fs::rename(&file_path, &new_path).map_err(|e| e.to_string())?;
    Ok(new_name)
}

#[tauri::command]
async fn reload_nginx_proxy(state: State<'_, AppState>) -> Result<String, String> {
    let docker_path = get_docker_cli_path();
    let host = state.config.lock().unwrap().docker_host.clone();
    
    let mut cmd = std::process::Command::new(&docker_path);
    cmd.args(["exec", "wdocker-nginx-proxy", "nginx", "-s", "reload"]);
    
    if !host.is_empty() {
        cmd.env("DOCKER_HOST", host);
    }

    let output = cmd.output().map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok("Nginx reloaded successfully".to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("Failed to reload Nginx: {}", stderr))
    }
}

#[tauri::command]
async fn read_router_log(project_name: String, log_type: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/logs/router");
    let file_name = if log_type == "access" {
        format!("{}_access.log", project_name)
    } else {
        format!("{}_error.log", project_name)
    };
    let file_path = base.join(file_name);
    
    if !file_path.exists() {
        return Ok("Log file not found (no traffic yet or log generation disabled)".to_string());
    }

    // Read last few lines for better performance
    let content = std::fs::read_to_string(&file_path).map_err(|e| e.to_string())?;
    let lines: Vec<&str> = content.lines().collect();
    let last_lines = if lines.len() > 100 {
        lines[lines.len() - 100..].join("\n")
    } else {
        content
    };
    
    Ok(last_lines)
}

#[tauri::command]
async fn save_project_file(project_name: String, file_name: String, content: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/projects");
    let project_dir = base.join(&project_name);
    std::fs::create_dir_all(&project_dir).map_err(|e| e.to_string())?;
    let file_path = project_dir.join(&file_name);
    std::fs::write(&file_path, &content).map_err(|e| e.to_string())?;
    Ok(format!("Saved {}", file_path.display()))
}

#[tauri::command]
async fn read_project_file(project_name: String, file_name: String) -> Result<String, String> {
    let base = expand_tilde("~/.wDocker/projects");
    let file_path = base.join(&project_name).join(&file_name);
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

// ── Storage Manager (Web Projects) ─────────────────────

fn expand_tilde(path: &str) -> std::path::PathBuf {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home.join(&path[2..]);
        }
    }
    std::path::PathBuf::from(path)
}

#[tauri::command]
async fn get_dir_size(path: String) -> Result<u64, String> {
    fn size(path: std::path::PathBuf) -> u64 {
        let mut total = 0;
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Ok(meta) = entry.metadata() {
                    if meta.is_dir() {
                        total += size(entry.path());
                    } else {
                        total += meta.len();
                    }
                }
            }
        }
        total
    }
    Ok(size(expand_tilde(&path)))
}

#[tauri::command]
async fn clean_dir_contents(path: String) -> Result<(), String> {
    let target = expand_tilde(&path);
    if !target.exists() {
        return Ok(());
    }

    fn truncate_recursive(path: &std::path::Path) -> std::io::Result<()> {
        if path.is_dir() {
            for entry in std::fs::read_dir(path)? {
                let entry = entry?;
                truncate_recursive(&entry.path())?;
            }
        } else if path.is_file() {
            // Open with truncate to clear content but keep file
            std::fs::OpenOptions::new()
                .write(true)
                .truncate(true)
                .open(path)?;
        }
        Ok(())
    }

    truncate_recursive(&target).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let app_data_dir = app.path().app_config_dir().unwrap_or_else(|_| {
                std::env::temp_dir().join("wdocker")
            });
            let config_path = app_data_dir.join("config.json");
            app.manage(AppState::load(config_path));
            Ok(())
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_docker_config, update_docker_config,
            get_docker_info,
            list_containers, inspect_container, container_logs,
            start_container, stop_container, restart_container,
            pause_container, unpause_container, remove_container,
            start_terminal, write_terminal, resize_terminal,
            list_images, inspect_image, pull_image, remove_image,
            list_volumes, inspect_volume, remove_volume, prune_volumes,
            list_networks, inspect_network, remove_network, create_network,
            launch_compose,
            get_system_df, execute_prune,
            read_hosts_file, write_hosts_file,
            get_dir_size, clean_dir_contents,
            stream_container_logs,
            save_router_config, read_router_config, list_router_configs, remove_router_config, toggle_router_config, reload_nginx_proxy, read_router_log,
            save_project_file, read_project_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
