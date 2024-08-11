use async_trait::async_trait;
use serde_json::Value;
use reqwest::Client;
use std::error::Error;
use std::fs::File;
use std::io::Read;

#[async_trait]
pub trait TranscriptionService {
    async fn transcribe(&self, audio_path: &str) -> Result<String, Box<dyn Error + Send + Sync>>;
}

pub struct TranscriptionManager {
    services: Vec<Box<dyn TranscriptionService + Send + Sync>>,
}

impl TranscriptionManager {
    pub fn new(settings: &Value) -> Result<Self, String> {
        let mut services: Vec<Box<dyn TranscriptionService + Send + Sync>> = Vec::new();

        // Helper function to get the value of a setting by id
        fn get_setting_value<'a>(settings: &'a Value, id: &str) -> Option<&'a Value> {
            settings.as_array()?.iter().find(|setting| setting["id"] == id).map(|setting| &setting["value"])
        }

        let use_cloud = get_setting_value(settings, "useCloudTranscription")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        if use_cloud {
            if let Some(deepgram_key) = get_setting_value(settings, "deepgramApiKey").and_then(|v| v.as_str()).filter(|key| !key.is_empty()) {
                services.push(Box::new(DeepgramService::new(deepgram_key)));
            }
            else if let Some(groq_key) = get_setting_value(settings, "groqApiKey").and_then(|v| v.as_str()).filter(|key| !key.is_empty()) {
                services.push(Box::new(GroqService::new(groq_key)));
            }
            else {
                return Err("No API key provided for any transcription service".to_string());
            }
        } else {
            return Err("Currently only cloud is supported".to_string());
        }

        if services.is_empty() {
            return Err("No transcription services available".to_string());
        }

        Ok(Self { services })
    }

    pub async fn transcribe(&self, audio_path: &str) -> Result<String, String> {
        let mut error_messages = Vec::new();
    
        for service in &self.services {
            match service.transcribe(audio_path).await {
                Ok(transcript) => return Ok(transcript),
                Err(e) => {
                    let service_name = std::any::type_name::<dyn TranscriptionService>();
                    let error_message = format!("Service {} failed: {}", service_name, e);
                    eprintln!("{}", error_message);
                    error_messages.push(error_message);
                }
            }
        }
    
        Err(format!(
            "Transcription failed:\n{}",
            error_messages.join("\n")
        ))
    }
    
}

struct DeepgramService {
    api_key: String,
    model: String,
}

impl DeepgramService {
    fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            model: "whisper-medium".to_string(),
        }
    }

    async fn transcribe_audio(&self, file_path: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        let client = Client::new();

        // Read the audio file
        let mut file = File::open(file_path)?;
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;

        let api_url = format!("https://api.deepgram.com/v1/listen?model={}&smart_format=true&diarize=true&language=en", self.model);

        // Send the request to Deepgram API
        let response = client
            .post(api_url)
            .header("Authorization", format!("Token {}", self.api_key))
            .header("Content-Type", "audio/mpeg")
            .body(buffer)
            .send()
            .await?;

        // Check if the request was successful
        if response.status().is_success() {
            let response_text = response.text().await?;
            Ok(response_text)
        } else {
            Err(format!("API request failed with status: {}", response.status()).into())
        }
    }
    
}

#[async_trait]
impl TranscriptionService for DeepgramService {
    async fn transcribe(&self, audio_path: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        self.transcribe_audio(audio_path).await
    }
}

struct GroqService {
    api_key: String,
}

impl GroqService {
    fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
        }
    }
}

#[async_trait]
impl TranscriptionService for GroqService {
    async fn transcribe(&self, _audio_path: &str) -> Result<String, Box<dyn Error + Send + Sync>> {
        // Implement Groq transcription
        unimplemented!()
    }
}
