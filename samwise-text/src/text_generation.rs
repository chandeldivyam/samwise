// src/text_generation.rs

use eyre::{eyre, Result};
use reqwest::Client;
use serde::Deserialize;
use serde_json::{json, Value};
use tracing::{debug, error};

#[derive(Deserialize)]
pub struct TextGenerationOptions {
    pub ollama_base_url: String,
    pub ollama_model: String,
    pub google_api_key: String,
    pub max_output_tokens: i32,
}
#[derive(Deserialize)]
pub enum TextGenerationStrategy {
    Ollama,
    GoogleGemini,
}

pub async fn generate_text(
    strategy: TextGenerationStrategy,
    options: &TextGenerationOptions,
    messages: Vec<Value>,
) -> Result<String> {
    match strategy {
        TextGenerationStrategy::Ollama => generate_text_ollama(options, messages).await,
        TextGenerationStrategy::GoogleGemini => generate_text_gemini(options, messages).await,
    }
}

async fn generate_text_ollama(options: &TextGenerationOptions, messages: Vec<Value>) -> Result<String> {
    let client = Client::new();
    let url = format!("{}/v1/chat/completions", options.ollama_base_url);

    debug!("Sending request to Ollama API: {}", url);

    let response = client
        .post(&url)
        .json(&json!({
            "model": options.ollama_model,
            "messages": messages,
        }))
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send request to Ollama API: {}", e);
            eyre!("Failed to send request to Ollama API: {}", e)
        })?;

    let response_body: Value = response.json().await.map_err(|e| {
        error!("Failed to parse Ollama API response: {}", e);
        eyre!("Failed to parse Ollama API response: {}", e)
    })?;

    response_body["choices"][0]["message"]["content"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            error!("Failed to extract response text from Ollama API");
            eyre!("Failed to extract response text from Ollama API")
        })
}

async fn generate_text_gemini(options: &TextGenerationOptions, messages: Vec<Value>) -> Result<String> {
    let client = Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}",
        options.google_api_key
    );

    debug!("Sending request to Google Gemini API");

    let gemini_messages = convert_messages_to_gemini_format(&messages)?;

    let request_body = json!({
        "contents": gemini_messages,
        "generationConfig": {
            "temperature": 1,
            "topK": 64,
            "topP": 0.95,
            "maxOutputTokens": options.max_output_tokens,
            "responseMimeType": "text/plain"
        }
    });

    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| {
            error!("Failed to send request to Google Gemini API: {}", e);
            eyre!("Failed to send request to Google Gemini API: {}", e)
        })?;

    let response_body: Value = response.json().await.map_err(|e| {
        error!("Failed to parse Google Gemini API response: {}", e);
        eyre!("Failed to parse Google Gemini API response: {}", e)
    })?;

    response_body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            error!("Failed to extract response text from Google Gemini API");
            eyre!("Failed to extract response text from Google Gemini API")
        })
}

fn convert_messages_to_gemini_format(messages: &[Value]) -> Result<Vec<Value>> {
    messages
        .iter()
        .map(|message| {
            let role = message["role"].as_str().ok_or_else(|| eyre!("Missing role in message"))?;
            let content = message["content"]
                .as_str()
                .ok_or_else(|| eyre!("Missing content in message"))?;

            Ok(json!({
                "role": role,
                "parts": [
                    {
                        "text": content
                    }
                ]
            }))
        })
        .collect()
}
