use anyhow::{anyhow, Result};
use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use cpal::SampleFormat;
use hound::{WavSpec, WavWriter};
use log::{error, info};
use std::sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}};
use std::time::{Duration, Instant};
use chrono::Local;
use std::thread;
use std::fs;
use tauri::Window;
use crate::audio_processor::audio_utils::{merge_wav_files, convert_wav_to_mp3, superimpose_wav_files};

struct AudioPacket {
    sequence_number: u64,
    timestamp: Duration,
    data: Vec<f32>,
}

pub struct AudioRecorder {
    input_stream: Option<cpal::Stream>,
    output_stream: Option<cpal::Stream>,
    input_buffer: Arc<Mutex<Vec<AudioPacket>>>,
    output_buffer: Arc<Mutex<Vec<AudioPacket>>>,
    input_config: Option<cpal::SupportedStreamConfig>,
    output_config: Option<cpal::SupportedStreamConfig>,
    start_time: Option<Instant>,
    input_next_sequence_number: Arc<Mutex<u64>>,
    output_next_sequence_number: Arc<Mutex<u64>>,
    input_expected_packet_duration: Duration,
    output_expected_packet_duration: Duration,
    last_input_device: Arc<Mutex<Option<cpal::Device>>>,
    last_output_device: Arc<Mutex<Option<cpal::Device>>>,
    part_number: Arc<Mutex<u64>>,
    recording_active: Arc<AtomicBool>,
    start_timestamp: String,
    input_wav_files: Arc<Mutex<Vec<String>>>,
    output_wav_files: Arc<Mutex<Vec<String>>>,
    input_stream_active: Arc<AtomicBool>,
    output_stream_active: Arc<AtomicBool>,
}

impl AudioRecorder {
    pub fn new() -> Result<Self> {
        let start_timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();

        Ok(Self {
            input_stream: None,
            output_stream: None,
            input_buffer: Arc::new(Mutex::new(Vec::new())),
            output_buffer: Arc::new(Mutex::new(Vec::new())),
            input_config: None,
            output_config: None,
            start_time: None,
            input_next_sequence_number: Arc::new(Mutex::new(0)),
            output_next_sequence_number: Arc::new(Mutex::new(0)),
            input_expected_packet_duration: Duration::from_millis(0),
            output_expected_packet_duration: Duration::from_millis(0),
            last_input_device: Arc::new(Mutex::new(None)),
            last_output_device: Arc::new(Mutex::new(None)),
            part_number: Arc::new(Mutex::new(1)),
            recording_active: Arc::new(AtomicBool::new(true)),
            start_timestamp,
            input_wav_files: Arc::new(Mutex::new(Vec::new())),
            output_wav_files: Arc::new(Mutex::new(Vec::new())),
            input_stream_active: Arc::new(AtomicBool::new(false)),
            output_stream_active: Arc::new(AtomicBool::new(false)),
        })
    }

    pub fn start_recording(&mut self) -> Result<()> {
        self.start_timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();

        let output_device = get_default_output_device()?;
        let input_device = get_default_input_device()?;

        self.input_config = Some(input_device.default_input_config()?);
        self.output_config = Some(output_device.default_output_config()?);

        info!("Output Device: {}", output_device.name()?);
        info!("Output Device config: {:?}", self.output_config);
        info!("Input Device: {}", input_device.name()?);
        info!("Input Device config: {:?}", self.input_config);

        self.start_time = Some(Instant::now());
        self.reset_buffers();

        self.input_expected_packet_duration = self.calculate_expected_packet_duration(self.input_config.as_ref().unwrap());
        self.output_expected_packet_duration = self.calculate_expected_packet_duration(self.output_config.as_ref().unwrap());

        let input_stream = self.retry(|| self.build_input_stream(&input_device))?;
        let output_stream = self.retry(|| self.build_output_stream(&output_device))?;
        self.input_stream = Some(input_stream);
        self.output_stream = Some(output_stream);

        self.start_streams()?;

        self.store_last_used_devices(input_device, output_device);

        self.periodically_check_and_update_devices();

        info!("Recording started");
        Ok(())
    }

    pub fn stop_recording(&mut self, window: &Window, id: i64, file_path: Option<String>) -> Result<()> {
        self.recording_active.store(false, Ordering::SeqCst);
    
        if let Err(e) = self.pause_streams() {
            error!("Failed to pause streams: {}", e);
        }
    
        let part_num = {
            let mut part_number = self.part_number.lock().unwrap();
            *part_number += 1;
            *part_number - 1
        };
    
        let input_filename = format!("mic_recording_{}_part{}.wav", self.start_timestamp, part_num);
        let output_filename = format!("speaker_recording_{}_part{}.wav", self.start_timestamp, part_num);
    
        if let Err(e) = self.write_to_file(&input_filename, &self.input_buffer, self.input_config.as_ref().unwrap(), self.input_expected_packet_duration) {
            error!("Failed to write input file: {}", e);
        } else {
            self.input_wav_files.lock().unwrap().push(input_filename.clone());
        }
    
        if let Err(e) = self.write_to_file(&output_filename, &self.output_buffer, self.output_config.as_ref().unwrap(), self.output_expected_packet_duration) {
            error!("Failed to write output file: {}", e);
        } else {
            self.output_wav_files.lock().unwrap().push(output_filename.clone());
        }
    
        let input_filenames: Vec<String> = self.input_wav_files.lock().unwrap().clone();
        let output_filenames: Vec<String> = self.output_wav_files.lock().unwrap().clone();
        let start_timestamp = self.start_timestamp.clone();
    
        let window_clone = window.clone(); // Clone the window handle
        let id_clone = id.clone();
        let file_path_clone = file_path.clone();

        thread::spawn(move || {
            // Merge WAV files
            let merged_mic_wav = format!("merged_mic_{}.wav", start_timestamp);
            let merged_speaker_wav = format!("merged_speaker_{}.wav", start_timestamp);
    
            if let Err(e) = merge_wav_files(&input_filenames, merged_mic_wav.clone()) {
                error!("Failed to merge mic WAV files: {}", e);
            }
            if let Err(e) = merge_wav_files(&output_filenames, merged_speaker_wav.clone()) {
                error!("Failed to merge speaker WAV files: {}", e);
            }
    
            // Superimpose merged WAV files
            let superimposed_wav = format!("superimposed_{}.wav", start_timestamp);
            if let Err(e) = superimpose_wav_files(&merged_mic_wav, &merged_speaker_wav, &superimposed_wav) {
                error!("Failed to superimpose WAV files: {}", e);
            }
    
            // Convert superimposed WAV to MP3
            let final_mp3 = if let Some(path) = file_path_clone {
                path
            } else {
                format!("final_{}.mp3", start_timestamp)
            };
            if let Err(e) = convert_wav_to_mp3(&superimposed_wav, &final_mp3) {
                error!("Failed to convert superimposed WAV to MP3: {}", e);
            }
    
            // Emit event with final MP3 filename
            window_clone.emit("recording_processed", id_clone).expect("Failed to emit event");
    
            // Clean up temporary files
            for file in input_filenames.iter().chain(output_filenames.iter()) {
                if let Err(e) = fs::remove_file(file) {
                    error!("Failed to remove temporary WAV file {}: {}", file, e);
                }
            }
    
            if let Err(e) = fs::remove_file(&merged_mic_wav) {
                error!("Failed to remove merged mic WAV file: {}", e);
            }
            if let Err(e) = fs::remove_file(&merged_speaker_wav) {
                error!("Failed to remove merged speaker WAV file: {}", e);
            }
            if let Err(e) = fs::remove_file(&superimposed_wav) {
                error!("Failed to remove superimposed WAV file: {}", e);
            }
        });
    
        self.reset_fields();
    
        Ok(())
    }  
    fn retry<F, T>(&self, mut f: F) -> Result<T>
    where
        F: FnMut() -> Result<T>,
    {
        let mut attempts = 0;
        while attempts < 3 {
            match f() {
                Ok(result) => return Ok(result),
                Err(e) => {
                    attempts += 1;
                    error!("Attempt {} failed with error: {}", attempts, e);
                    thread::sleep(Duration::from_secs(1));
                }
            }
        }
        Err(anyhow!("Failed after 3 attempts"))
    }

    fn reset_buffers(&mut self) {
        self.input_buffer = Arc::new(Mutex::new(Vec::new()));
        self.output_buffer = Arc::new(Mutex::new(Vec::new()));
        self.input_next_sequence_number = Arc::new(Mutex::new(0));
        self.output_next_sequence_number = Arc::new(Mutex::new(0));
    }

    fn reset_fields(&mut self) {
        self.input_stream = None;
        self.output_stream = None;
        self.input_config = None;
        self.output_config = None;
        self.start_time = None;
        self.reset_buffers();
        self.input_expected_packet_duration = Duration::from_millis(0);
        self.output_expected_packet_duration = Duration::from_millis(0);
    }

    fn calculate_expected_packet_duration(&self, config: &cpal::SupportedStreamConfig) -> Duration {
        let sample_rate = config.sample_rate().0 as f64;
        let frames = match config.buffer_size() {
            cpal::SupportedBufferSize::Range { min, max: _ } => *min,
            cpal::SupportedBufferSize::Unknown => 1024,
        };
        Duration::from_secs_f64(frames as f64 / sample_rate)
    }

    fn build_input_stream(&self, device: &cpal::Device) -> Result<cpal::Stream> {
        let config = self.input_config.as_ref().unwrap();
        self.build_stream(device, config, self.input_buffer.clone(), self.input_next_sequence_number.clone(), true)
    }

    fn build_output_stream(&self, device: &cpal::Device) -> Result<cpal::Stream> {
        let config = self.output_config.as_ref().unwrap();
        self.build_stream(device, config, self.output_buffer.clone(), self.output_next_sequence_number.clone(), false)
    }

    fn build_stream(&self, device: &cpal::Device, config: &cpal::SupportedStreamConfig, buffer: Arc<Mutex<Vec<AudioPacket>>>, next_sequence_number: Arc<Mutex<u64>>, is_input: bool) -> Result<cpal::Stream> {
        let start_time = self.start_time.expect("Start time should be set");
        let stream_active = if is_input {
            self.input_stream_active.clone()
        } else {
            self.output_stream_active.clone()
        };
        let err_fn = move |err| {
            error!("Error on audio stream: {}", err);
            stream_active.store(false, Ordering::SeqCst);
        };

        // Maybe we should try build_output_stream for microphone for better quality.
        let stream = device.build_input_stream(
            &config.config(),
            move |data: &[f32], _: &_| {
                let timestamp = start_time.elapsed();
                let sequence_number = {
                    let mut seq = next_sequence_number.lock().unwrap();
                    let current = *seq;
                    *seq += 1;
                    current
                };

                let packet = AudioPacket { sequence_number, timestamp, data: data.to_vec() };

                if let Ok(mut guard) = buffer.try_lock() {
                    guard.push(packet);
                }
            },
            err_fn,
            None,
        )?;

        if is_input {
            self.input_stream_active.store(true, Ordering::SeqCst);
        } else {
            self.output_stream_active.store(true, Ordering::SeqCst);
        }

        Ok(stream)
    }

    fn start_streams(&self) -> Result<()> {
        if let Some(stream) = &self.input_stream {
            stream.play()?;
        }
        if let Some(stream) = &self.output_stream {
            stream.play()?;
        }
        Ok(())
    }

    fn pause_streams(&self) -> Result<()> {
        if let Some(stream) = &self.input_stream {
            stream.pause()?;
        }
        if let Some(stream) = &self.output_stream {
            stream.pause()?;
        }
        Ok(())
    }

    fn store_last_used_devices(&self, input_device: cpal::Device, output_device: cpal::Device) {
        let mut last_input = self.last_input_device.lock().unwrap();
        let mut last_output = self.last_output_device.lock().unwrap();
        *last_input = Some(input_device);
        *last_output = Some(output_device);
    }

    fn periodically_check_and_update_devices(&self) {
        let last_input_device = self.last_input_device.clone();
        let last_output_device = self.last_output_device.clone();
        let input_buffer = self.input_buffer.clone();
        let output_buffer = self.output_buffer.clone();
        let input_next_sequence_number = self.input_next_sequence_number.clone();
        let output_next_sequence_number = self.output_next_sequence_number.clone();
        let start_time = self.start_time.clone();
        let part_number = self.part_number.clone();
        let input_config = self.input_config.clone().unwrap();
        let output_config = self.output_config.clone().unwrap();
        let input_expected_packet_duration = self.input_expected_packet_duration;
        let output_expected_packet_duration = self.output_expected_packet_duration;
        let recording_active = self.recording_active.clone();
        let start_timestamp = self.start_timestamp.clone();
        let input_wav_files = self.input_wav_files.clone();  // Use the existing Arc<Mutex<Vec<String>>>
        let output_wav_files = self.output_wav_files.clone();
        let input_stream_active = self.input_stream_active.clone();
        let output_stream_active = self.output_stream_active.clone();

        thread::spawn(move || {
            while recording_active.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_secs(2));

                if input_buffer.lock().unwrap().len() > 6000 || output_buffer.lock().unwrap().len() > 6000 {
                    let part_num = *part_number.lock().unwrap();
                    let input_filename = format!("mic_recording_{}_part{}.wav", start_timestamp, part_num);
                    let output_filename = format!("speaker_recording_{}_part{}.wav", start_timestamp, part_num);

                    if let Err(e) = write_to_file(&input_filename, &input_buffer, &input_config, input_expected_packet_duration) {
                        error!("Failed to write input file: {}", e);
                    } else {
                        input_wav_files.lock().unwrap().push(input_filename);
                    }
                    if let Err(e) = write_to_file(&output_filename, &output_buffer, &output_config, output_expected_packet_duration) {
                        error!("Failed to write output file: {}", e);
                    } else {
                        output_wav_files.lock().unwrap().push(output_filename);
                    }
                    *part_number.lock().unwrap() += 1;
                    input_buffer.lock().unwrap().clear();
                    output_buffer.lock().unwrap().clear();
                }

                let new_input_device = get_default_input_device().ok();
                let new_output_device = get_default_output_device().ok();
                let mut last_input = last_input_device.lock().unwrap();
                let mut last_output = last_output_device.lock().unwrap();

                if !input_stream_active.load(Ordering::SeqCst) {
                    println!("Input stream is dead");
                    if let Some(new_input_device) = get_default_input_device().ok() {
                        if let Ok(new_config) = new_input_device.default_input_config() {
                            if let Err(e) = update_input_stream(
                                new_input_device.clone(),
                                new_config,
                                input_buffer.clone(),
                                input_next_sequence_number.clone(),
                                start_time.clone(),
                                last_input_device.clone(),
                                input_stream_active.clone(),
                            ) {
                                error!("Failed to update input stream: {}", e);
                            }
                        }
                    }
                }

                if !output_stream_active.load(Ordering::SeqCst) {
                    println!("Output stream is dead");
                    if let Some(new_input_device) = get_default_output_device().ok() {
                        if let Ok(new_config) = new_input_device.default_output_config() {
                            if let Err(e) = update_output_stream(
                                new_input_device.clone(),
                                new_config,
                                input_buffer.clone(),
                                input_next_sequence_number.clone(),
                                start_time.clone(),
                                last_output_device.clone(),
                                output_stream_active.clone(),
                            ) {
                                error!("Failed to update input stream: {}", e);
                            }
                        }
                    }
                }

                update_stream_if_device_changed(&new_input_device, &mut last_input, &input_buffer, &input_next_sequence_number, &start_time, last_input_device.clone(), input_stream_active.clone(),true, update_input_stream);
                update_stream_if_device_changed(&new_output_device, &mut last_output, &output_buffer, &output_next_sequence_number, &start_time, last_output_device.clone(), output_stream_active.clone(), false, update_output_stream);
            }
        });
    }

    fn write_to_file(&self, filename: &str, buffer: &Arc<Mutex<Vec<AudioPacket>>>, config: &cpal::SupportedStreamConfig, expected_packet_duration: Duration) -> Result<()> {
        write_to_file(filename, buffer, config, expected_packet_duration)
    }
}

fn update_stream_if_device_changed(
    new_device: &Option<cpal::Device>,
    last_device: &mut Option<cpal::Device>,
    buffer: &Arc<Mutex<Vec<AudioPacket>>>,
    next_sequence_number: &Arc<Mutex<u64>>,
    start_time: &Option<Instant>,
    last_device_storage: Arc<Mutex<Option<cpal::Device>>>,
    stream_active: Arc<AtomicBool>,
    is_input: bool,
    update_fn: fn(cpal::Device, cpal::SupportedStreamConfig, Arc<Mutex<Vec<AudioPacket>>>, Arc<Mutex<u64>>, Option<Instant>, Arc<Mutex<Option<cpal::Device>>>, Arc<AtomicBool>) -> Result<()>,
) {
    if let Some(new_device) = new_device {
        if let Some(last_device) = last_device {
            let last_name = last_device.name();
            let new_name = new_device.name();
            if let (Ok(last_name), Ok(new_name)) = (last_name, new_name) {
                if last_name != new_name {
                    let new_config = if is_input {
                        new_device.default_input_config()
                    } else {
                        new_device.default_output_config()
                    };
                    if let Ok(new_config) = new_config {
                        if let Err(e) = update_fn(
                            new_device.clone(),
                            new_config,
                            buffer.clone(),
                            next_sequence_number.clone(),
                            start_time.clone(),
                            last_device_storage.clone(),
                            stream_active.clone(),
                        ) {
                            error!("Failed to update stream: {}", e);
                        }
                    }
                }
            }
        } else if let Ok(new_config) = if is_input {
            new_device.default_input_config()
        } else {
            new_device.default_output_config()
        } {
            if let Err(e) = update_fn(
                new_device.clone(),
                new_config,
                buffer.clone(),
                next_sequence_number.clone(),
                start_time.clone(),
                last_device_storage.clone(),
                stream_active.clone(),
            ) {
                error!("Failed to update stream: {}", e);
            }
        }
    }
}

fn update_input_stream(
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
    buffer: Arc<Mutex<Vec<AudioPacket>>>,
    next_sequence_number: Arc<Mutex<u64>>,
    start_time: Option<Instant>,
    last_input_device: Arc<Mutex<Option<cpal::Device>>>,
    input_stream_active: Arc<AtomicBool>,
) -> Result<()> {
    update_stream(device, config, buffer, next_sequence_number, start_time, last_input_device, input_stream_active)
}

fn update_output_stream(
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
    buffer: Arc<Mutex<Vec<AudioPacket>>>,
    next_sequence_number: Arc<Mutex<u64>>,
    start_time: Option<Instant>,
    last_output_device: Arc<Mutex<Option<cpal::Device>>>,
    output_stream_active: Arc<AtomicBool>,
) -> Result<()> {
    update_stream(device, config, buffer, next_sequence_number, start_time, last_output_device, output_stream_active)
}

fn update_stream(
    device: cpal::Device,
    config: cpal::SupportedStreamConfig,
    buffer: Arc<Mutex<Vec<AudioPacket>>>,
    next_sequence_number: Arc<Mutex<u64>>,
    start_time: Option<Instant>,
    last_device_storage: Arc<Mutex<Option<cpal::Device>>>,
    stream_active: Arc<AtomicBool>,
) -> Result<()> {
    let stream_active_clone = stream_active.clone();
    let err_fn = move |err| {
        error!("Error on audio stream: {}", err);
        stream_active_clone.store(false, Ordering::SeqCst);
    };

    let new_stream = device.build_input_stream(
        &config.config(),
        move |data: &[f32], _: &_| {
            let timestamp = start_time.unwrap().elapsed();
            let sequence_number = {
                let mut seq = next_sequence_number.lock().unwrap();
                let current = *seq;
                *seq += 1;
                current
            };

            let packet = AudioPacket { sequence_number, timestamp, data: data.to_vec() };

            if let Ok(mut guard) = buffer.try_lock() {
                guard.push(packet);
            }
        },
        err_fn,
        None,
    )?;

    new_stream.play()?;
    *last_device_storage.lock().unwrap() = Some(device);
    stream_active.store(true, Ordering::SeqCst);
    Ok(())
}

fn get_default_output_device() -> Result<cpal::Device> {
    #[cfg(target_os = "macos")]
    {
        cpal::host_from_id(cpal::HostId::CoreAudio)?
            .default_output_device()
            .ok_or_else(|| anyhow!("No default output device found"))
    }
    #[cfg(not(target_os = "macos"))]
    {
        cpal::default_host()
            .default_output_device()
            .ok_or_else(|| anyhow!("No default output device found"))
    }
}

fn get_default_input_device() -> Result<cpal::Device> {
    cpal::default_host()
        .default_input_device()
        .ok_or_else(|| anyhow!("No default input device found"))
}

fn sample_format(format: SampleFormat) -> hound::SampleFormat {
    if format.is_float() {
        hound::SampleFormat::Float
    } else {
        hound::SampleFormat::Int
    }
}

fn write_to_file(
    filename: &str,
    buffer: &Arc<Mutex<Vec<AudioPacket>>>,
    config: &cpal::SupportedStreamConfig,
    expected_packet_duration: Duration,
) -> Result<()> {
    let buffer = buffer.lock().unwrap();

    let spec = WavSpec {
        channels: config.channels() as _,
        sample_rate: config.sample_rate().0 as _,
        bits_per_sample: (config.sample_format().sample_size() * 8) as _,
        sample_format: sample_format(config.sample_format()),
    };

    let mut writer = WavWriter::create(filename, spec)?;

    let mut packets: Vec<_> = buffer.iter().collect();
    packets.sort_by_key(|p| p.sequence_number);

    let mut last_seq = packets.first().map(|p| p.sequence_number).unwrap_or(0);
    let mut last_timestamp = packets.first().map(|p| p.timestamp).unwrap_or(Duration::from_secs(0));

    for packet in packets {
        while packet.sequence_number > last_seq + 1 {
            let silence_duration = expected_packet_duration;
            let silence_samples = (silence_duration.as_secs_f64() * config.sample_rate().0 as f64) as usize;
            for _ in 0..silence_samples {
                writer.write_sample(0.0f32)?;
            }
            last_seq += 1;
            last_timestamp += silence_duration;
        }

        for &sample in &packet.data {
            writer.write_sample(sample)?;
        }

        last_seq = packet.sequence_number;
        last_timestamp = packet.timestamp;
    }

    writer.finalize()?;
    Ok(())
}
