// src/test.rs

use crate::text_generation::{generate_text, TextGenerationOptions, TextGenerationStrategy};
use serde_json::json;

#[tokio::test]
async fn test_text_generation() {
    let options = TextGenerationOptions {
        ollama_base_url: "http://localhost:11434".to_string(),
        ollama_model: "phi3.5".to_string(),
        google_api_key: "gemini_api_key".to_string(),
        max_output_tokens: 1024,
        gemini_model: "gemini-1.5-flash".to_string(),
    };

    let messages = vec![json!({"role": "user", "content": "Hello! tell me a joke"})];

    let messages_clone = messages.clone();

    // Test Ollama
    match generate_text(TextGenerationStrategy::Ollama, &options, messages_clone).await {
        Ok(result) => println!("Ollama result: {}", result),
        Err(e) => println!("Ollama error: {}", e),
    }

    // Test Google Gemini
    match generate_text(TextGenerationStrategy::GoogleGemini, &options, messages).await {
        Ok(result) => println!("Google Gemini result: {}", result),
        Err(e) => println!("Google Gemini error: {}", e),
    }
}
