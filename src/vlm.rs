use serde::{Deserialize, Serialize};
use serde_json::json;

#[derive(Debug, Serialize)]
struct ImageUrl {
    url: String,
    detail: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
enum MessageContent {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "image_url")]
    ImageUrl { image_url: ImageUrl },
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: Vec<MessageContent>,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

/// Calls OpenAI VLM API with an image and prompt
///
/// # Arguments
/// * `api_key` - Your OpenAI API key
/// * `image_url` - URL of the image to analyze
/// * `prompt` - Text prompt to send with the image
/// * `model` - Model to use (e.g., "gpt-4o", "gpt-4o-mini")
pub async fn call_openai_vlm(
    api_key: String,
    image_url: String,
    prompt: String,
    model: String,
) -> Result<String, Box<dyn std::error::Error + Send + Sync + 'static>> {
    let client = reqwest::Client::new();

    let messages = vec![Message {
        role: "user".to_string(),
        content: vec![
            MessageContent::Text { text: prompt },
            MessageContent::ImageUrl {
                image_url: ImageUrl {
                    url: image_url,
                    detail: Some("auto".to_string()),
                },
            },
        ],
    }];

    let request_body = json!({
        "model": model,
        "messages": messages,
        "max_tokens": 1000,
    });

    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await?;

    if !response.status().is_success() {
        let error_text = response.text().await?;
        return Err(format!("API error: {}", error_text).into());
    }

    let chat_response: ChatResponse = response.json().await?;

    Ok(chat_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_else(|| "No response".to_string()))
}

/// Alternative: Call with base64 encoded image
pub async fn call_openai_vlm_base64(
    api_key: String,
    image_base64: String,
    prompt: String,
    model: String,
) -> Result<String, Box<dyn std::error::Error + Send + Sync + 'static>> {
    let image_url = format!("data:image/jpeg;base64,{}", image_base64);
    call_openai_vlm(api_key, image_url, prompt, model).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_vlm_call() {
        // Example usage (requires actual API key)
        let api_key = "your-api-key-here".to_string();
        let image_url = "https://example.com/image.jpg".to_string();
        let prompt = "What's in this image?".to_string();
        let model = "gpt-4o-mini".to_string();

        match call_openai_vlm(api_key, image_url, prompt, model).await {
            Ok(response) => println!("Response: {}", response),
            Err(e) => eprintln!("Error: {}", e),
        }
    }
}
