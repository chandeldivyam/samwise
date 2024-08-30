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
    pub ollama_api_key: String,
    pub google_api_key: String,
    pub gemini_model: String,
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
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", options.ollama_api_key))
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
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        options.gemini_model, options.google_api_key
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
            eyre!("Network error: Failed to send request to Google Gemini API. Please check your internet connection and try again.")
        })?;

    if !response.status().is_success() {
        let error_body: Value = response.json().await.map_err(|e| {
            error!("Failed to parse error response from Google Gemini API: {}", e);
            eyre!("Unexpected API response: Unable to parse error details. Please try again later.")
        })?;

        let error_message = error_body["error"]["message"].as_str().unwrap_or("Unknown error occurred");
        let error_code = error_body["error"]["code"]
            .as_u64()
            .map(|code| code.to_string())
            .unwrap_or_else(|| "Unknown".to_string());

        error!("Google Gemini API error: {} (Code: {})", error_message, error_code);
        return Err(eyre!("API Error (Code: {}): {}", error_code, error_message));
    }

    let response_body: Value = response.json().await.map_err(|e| {
        error!("Failed to parse Google Gemini API response: {}", e);
        eyre!("Unexpected API response: Unable to parse the response. Please try again later.")
    })?;

    response_body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| {
            error!("Failed to extract response text from Google Gemini API");
            eyre!("Unexpected API response: The response format was not as expected. Please try again later.")
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

            let mapped_role = match role {
                "user" => "user",
                "assistant" => "model",
                _ => role, // Keep other roles as they are
            };

            Ok(json!({
                "role": mapped_role,
                "parts": [
                    {
                        "text": content
                    }
                ]
            }))
        })
        .collect()
}
