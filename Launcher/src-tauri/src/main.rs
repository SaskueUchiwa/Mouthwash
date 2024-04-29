#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use winreg::enums::*;
use winreg::RegKey;

use futures_util::stream::StreamExt;
use zip::ZipArchive;
use std::fs::{self, File};
use std::path;
use std::path::Path;
use std::time::SystemTime;
use std::io;

#[tauri::command]
fn get_steam_registry_install_location() -> String {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let cur_ver = hklm.open_subkey("SOFTWARE\\WOW6432Node\\Valve\\Steam");

    if cur_ver.is_err() {
        return "".to_string();
    }

    let pf = cur_ver.unwrap().get_value("InstallPath");

    if pf.is_err() {
        return "".to_string();
    }

    return pf.unwrap();
}

#[derive(serde::Serialize)]
#[derive(Clone)]
struct DownloadProgress {
    bytes_per_second: f64,
    download_ratio: f32,
    file_size: u64,
    download_id: String
}

async fn download_and_stream_file(window: & tauri::Window, url: String, download_id: String) -> Option<Vec<u8>> {
    let _ = window.emit("mwgg://start-download", download_id.clone());
    let res_possible = reqwest::get(url)
        .await;

    if res_possible.is_err() {
        return None;
    }

    let res = res_possible.unwrap();

    let content_size = res.content_length()?;
    let mut stream = res.bytes_stream();
    let mut all_bytes: Vec<u8> = vec![];

    // let mut samples: Vec::<DownloadRecordSample> = vec![];
    let mut last_sample_time = SystemTime::now();
    let mut sample_bytes: u64 = 0;
    let mut total_bytes: u64 = 0;

    while let Some(item) = stream.next().await {
        let this_chunk = item.unwrap();
        let mut chunk_bytes = this_chunk.to_vec();
        all_bytes.append(&mut chunk_bytes);

        sample_bytes += this_chunk.len() as u64;
        total_bytes += this_chunk.len() as u64;

        let current_time = SystemTime::now();
        let ms_duration_last_sample_possible = current_time.duration_since(last_sample_time);

        if ms_duration_last_sample_possible.is_err() {
            return None;
        }

        let ms_duration_last_sample = ms_duration_last_sample_possible.unwrap().as_millis();

        if ms_duration_last_sample > 50 {
            let record_sample = DownloadProgress{
                bytes_per_second: (sample_bytes as f64) / ((ms_duration_last_sample as f64 / 1000 as f64) as f64),
                download_ratio: (total_bytes as f32) / (content_size as f32),
                file_size: content_size,
                download_id: download_id.clone()
            };
            // samples.push(record_sample);
            let _ = window.emit("mwgg://download-progress", record_sample);
            sample_bytes = 0;
            last_sample_time = current_time;
        }
    }

    let _ = window.emit("mwgg://finish-download", download_id.clone());
    return Some(all_bytes);
}

async fn extract_downloaded_file(buf: Vec<u8>, destination: &str) -> Option<bool> {
    let _ = fs::create_dir_all(destination);

    let reader = std::io::Cursor::new(buf);

    let zip_possible = ZipArchive::new(reader);
    if zip_possible.is_err() { return None; }

    let mut zip = zip_possible.unwrap();
    for i in 0..zip.len() {
        let mut file = zip.by_index(i).unwrap();
        let file_name = Path::new(destination).join(file.enclosed_name()?);
        if file.is_dir() {
            let _ = fs::create_dir_all(file_name);
        } else if file.is_file() {
            if let Some(p) = file_name.parent() {
                if !p.exists() {
                    let _ = fs::create_dir_all(&p);
                }
            }
            let out_file = File::create(file_name);
            let _ = io::copy(&mut file, &mut out_file.unwrap());
        }
    }

    return Some(true);
}

#[tauri::command]
async fn download_file_and_extract(window: tauri::Window, url: String, folder: String, download_id: String) -> Option<bool> {
    let depot_downloader_zip_bytes =
        download_and_stream_file(&window, url, download_id).await?;

    extract_downloaded_file(depot_downloader_zip_bytes, &folder).await;

    return Some(true);
}

#[tauri::command]
async fn download_file(window: tauri::Window, url: String, file: String, download_id: String) -> Option<bool> {
    let depot_downloader_zip_bytes =
        download_and_stream_file(&window, url, download_id).await?;

    let file_path = path::Path::new(&file);
    let _ = fs::create_dir_all(file_path.parent().unwrap().to_string_lossy().to_string());
    let _ = fs::write(file, depot_downloader_zip_bytes);

    return Some(true);
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_steam_registry_install_location, download_file_and_extract, download_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
