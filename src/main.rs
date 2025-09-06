mod vlm;

use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error + Send + Sync + 'static>> {
    if !dotenv::dotenv().is_ok() {
        println!("Could not load .env");
        std::process::exit(0);
    }

    // let api_key = std::env::var("OPENAI_API_KEY").expect("Could not find OPENAI_API_KEY");
    // let imageurl = std::env::args().nth(1).expect("Image url not found");

    // let response = vlm::call_openai_vlm(&api_key, &imageurl, "Is there trash in this image? This is meant for a trash detection model, can you give the scene a cleanliness score between 0-100, with 100 being really trash and 0 being extremely clean. ONLY OUTPUT THE SCORE.", "gpt-4o-mini").await.expect("Failed to send request to openai");

    // println!("{}", response);

    Ok(())
}
