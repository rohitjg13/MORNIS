mod config;
mod types;
mod vlm;
mod webserver;

use std::{env, error::Error, net::SocketAddr, str::FromStr};

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

    let address = match env::var("ADDRESS") {
        Ok(addr) => SocketAddr::from_str(&addr).unwrap(),
        Err(_) => SocketAddr::from_str("127.0.0.1").unwrap(),
    };

    let port = match env::var("PORT") {
        Ok(port) => port.parse::<u32>().expect("Invalid port"),
        Err(_) => 7504,
    };

    let conf = config::Config {
        webserver_address: Some(address),
        webserver_port: Some(port),
        openai_key: env::var("OPENAI_API_KEY").expect("Could not find openai key in .env"),
        supabase_url: env::var("SUPABASE_URL").expect("Could not find supabase url"),
        subabase_key: env::var("SUPABASE_KEY").expect("Could not find supabase key"),
    };

    let _ = webserver::run_ws(conf).await;

    Ok(())
}
