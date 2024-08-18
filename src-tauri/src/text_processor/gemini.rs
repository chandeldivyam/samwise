use reqwest;
use serde_json::json;

#[tauri::command]
pub async fn generate_text(
    history: Vec<serde_json::Value>,
    max_output_tokens: i32,
    api_key: String,
) -> Result<String, String> {
    let client = reqwest::Client::new();

    let request_body = json!({
        "contents": history,
        "generationConfig": {
            "temperature": 1,
            "topK": 64,
            "topP": 0.95,
            "maxOutputTokens": max_output_tokens,
            "responseMimeType": "text/plain"
        }
    });

    let response = client.post(format!("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let response_body: serde_json::Value = response.json().await.map_err(|e| e.to_string())?;

    response_body["candidates"][0]["content"]["parts"][0]["text"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or("Failed to extract response text".to_string())
}