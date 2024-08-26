// src/chat.rs

use eyre::{eyre, Result};
use samwise_text::text_generation::{generate_text, TextGenerationOptions, TextGenerationStrategy};
use serde_json::Value;

#[tauri::command]
pub async fn process_chat_message(
    options: TextGenerationOptions,
    messages: Vec<Value>,
    strategy_str: String,
) -> Result<String, String> {
    // Convert the strategy string to TextGenerationStrategy
    let strategy = match strategy_str.as_str() {
        "ollama" => TextGenerationStrategy::Ollama,
        "gemini" => TextGenerationStrategy::GoogleGemini,
        _ => return Err(format!("Invalid text generation strategy: {}", strategy_str)),
    };

    // Generate text using the chosen strategy
    match generate_text(strategy, &options, messages).await {
        Ok(response) => Ok(response),
        Err(e) => Err(e.to_string()),
    }
}
