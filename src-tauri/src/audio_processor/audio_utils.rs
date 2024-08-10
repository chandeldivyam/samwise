// src-tauri/src/audio_utils.rs

use hound::{WavReader, WavWriter, SampleFormat};
use std::io::Read;
use std::path::{Path, PathBuf};
use mp3lame_encoder::{Builder, Id3Tag, DualPcm, FlushNoGap};
use std::fs::{File, create_dir_all};
use std::io::{BufReader, BufWriter, Write};

pub fn merge_wav_files<P: AsRef<Path>>(input_files: &[P], output_file: P) -> Result<(), Box<dyn std::error::Error>> {
    // Open the first input WAV file to get the specification
    let first_reader = WavReader::open(&input_files[0])?;
    let spec = first_reader.spec();

    // Create the output WAV file with the same specification
    let mut writer = WavWriter::create(output_file, spec)?;

    // Function to write samples from a reader to the writer
    fn write_samples<R>(
        reader: &mut WavReader<R>,
        writer: &mut WavWriter<std::io::BufWriter<std::fs::File>>,
        sample_format: SampleFormat,
    ) -> Result<(), Box<dyn std::error::Error>>
    where
        R: Read,
    {
        match sample_format {
            SampleFormat::Int => {
                for sample in reader.samples::<i16>() {
                    writer.write_sample(sample?)?;
                }
            }
            SampleFormat::Float => {
                for sample in reader.samples::<f32>() {
                    writer.write_sample(sample?)?;
                }
            }
        }
        Ok(())
    }

    // Iterate through all input files and write their samples to the output
    for input_file in input_files {
        let mut reader = WavReader::open(input_file)?;
        
        // Ensure all files have the same format
        if reader.spec() != spec {
            return Err(format!("Input file {:?} has a different audio format", input_file.as_ref()).into());
        }

        write_samples(&mut reader, &mut writer, spec.sample_format)?;
    }

    // Finalize the writer to ensure all data is written to disk
    writer.finalize()?;

    Ok(())
}

pub fn convert_wav_to_mp3<P: AsRef<Path>>(input_path: P, output_path: P) -> Result<(), Box<dyn std::error::Error>> {
    let wav_file = File::open(input_path)?;
    let mut wav_reader = WavReader::new(BufReader::new(wav_file))?;

    // Get WAV specification
    let spec = wav_reader.spec();

    let mp3_filepath = PathBuf::from(output_path.as_ref());
    if let Some(parent) = mp3_filepath.parent() {
        if !parent.exists() {
            create_dir_all(parent)?;
        }
    }


    // Collect samples
    let mut left_samples = Vec::new();
    let mut right_samples = Vec::new();

    match spec.sample_format {
        hound::SampleFormat::Int => {
            for sample in wav_reader.samples::<i32>() {
                let sample = sample?;
                // Convert i32 to i16
                let sample_i16 = (sample >> 16) as i16;
                // For stereo files, separate left and right samples
                if spec.channels == 2 {
                    if left_samples.len() <= right_samples.len() {
                        left_samples.push(sample_i16);
                    } else {
                        right_samples.push(sample_i16);
                    }
                } else {
                    left_samples.push(sample_i16);
                    right_samples.push(sample_i16);
                }
            }
        },
        hound::SampleFormat::Float => {
            for sample in wav_reader.samples::<f32>() {
                let sample = sample?;
                // Convert f32 to i16
                let sample_i16 = (sample * 32767.0) as i16;
                // For stereo files, separate left and right samples
                if spec.channels == 2 {
                    if left_samples.len() <= right_samples.len() {
                        left_samples.push(sample_i16);
                    } else {
                        right_samples.push(sample_i16);
                    }
                } else {
                    left_samples.push(sample_i16);
                    right_samples.push(sample_i16);
                }
            }
        },
    }

    // Set up the MP3 encoder
    let mut mp3_encoder = Builder::new().ok_or("Failed to create MP3 encoder")?;
    mp3_encoder.set_num_channels(2).map_err(|e| format!("Failed to set channels: {:?}", e))?;
    mp3_encoder.set_sample_rate(spec.sample_rate).map_err(|e| format!("Failed to set sample rate: {:?}", e))?;
    mp3_encoder.set_brate(mp3lame_encoder::Bitrate::Kbps192).map_err(|e| format!("Failed to set bitrate: {:?}", e))?;
    mp3_encoder.set_quality(mp3lame_encoder::Quality::Best).map_err(|e| format!("Failed to set quality: {:?}", e))?;
    // TODO - We should set the names wisely taking information from database
    let _ = mp3_encoder.set_id3_tag(Id3Tag {
        title: b"Recorded Audio",
        artist: &[],
        album_art: b"user",
        album: b"SAM Audio",
        year: b"2024",
        comment: b"This is secured information",
    });
    let mut mp3_encoder = mp3_encoder.build().map_err(|e| format!("Failed to build encoder: {:?}", e))?;

    // Encode the samples
    let input = DualPcm {
        left: &left_samples,
        right: &right_samples,
    };

    let mut mp3_out_buffer = Vec::new();
    mp3_out_buffer.reserve(mp3lame_encoder::max_required_buffer_size(input.left.len()));
    let encoded_size = mp3_encoder.encode(input, mp3_out_buffer.spare_capacity_mut())
        .map_err(|e| format!("Encoding failed: {:?}", e))?;
    unsafe {
        mp3_out_buffer.set_len(mp3_out_buffer.len().wrapping_add(encoded_size));
    }

    let encoded_size = mp3_encoder.flush::<FlushNoGap>(mp3_out_buffer.spare_capacity_mut())
        .map_err(|e| format!("Flushing failed: {:?}", e))?;
    unsafe {
        mp3_out_buffer.set_len(mp3_out_buffer.len().wrapping_add(encoded_size));
    }

    if !mp3_filepath.parent().unwrap().exists() {
        create_dir_all(mp3_filepath.parent().unwrap())?;
    }

    // Write the MP3 data to a file
    let mut mp3_file = BufWriter::new(File::create(&mp3_filepath)?); 
    mp3_file.write_all(&mp3_out_buffer)?;

    Ok(())
}

// Add this function to your audio_utils.rs file
pub fn superimpose_wav_files(input1: &str, input2: &str, output: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut reader1 = WavReader::open(input1)?;
    let mut reader2 = WavReader::open(input2)?;

    let spec = reader1.spec();
    let mut writer = WavWriter::create(output, spec)?;

    fn read_samples_as_f32(reader: &mut WavReader<BufReader<File>>) -> Vec<f32> {
        match reader.spec().sample_format {
            SampleFormat::Int => reader.samples::<i32>().map(|s| s.unwrap() as f32 / i32::MAX as f32).collect(),
            SampleFormat::Float => reader.samples::<f32>().map(|s| s.unwrap()).collect(),
        }
    }

    let samples1 = read_samples_as_f32(&mut reader1);
    let samples2 = read_samples_as_f32(&mut reader2);

    let max_len = std::cmp::max(samples1.len(), samples2.len());

    for i in 0..max_len {
        let sample1 = if i < samples1.len() { samples1[i] } else { 0.0 };
        let sample2 = if i < samples2.len() { samples2[i] } else { 0.0 };
        
        let mixed_sample = (sample1 + sample2) / 2.0;
        
        match spec.sample_format {
            SampleFormat::Int => {
                let int_sample = (mixed_sample * i32::MAX as f32) as i32;
                writer.write_sample(int_sample)?;
            },
            SampleFormat::Float => {
                writer.write_sample(mixed_sample)?;
            },
        }
    }

    writer.finalize()?;
    Ok(())
}
