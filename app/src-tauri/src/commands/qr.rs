// QR code utility commands

use qrcode::QrCode;
use image::{DynamicImage, Luma};
use base64::{Engine as _, engine::general_purpose};
use flate2::write::GzEncoder;
use flate2::read::GzDecoder;
use flate2::Compression;
use std::io::{Write, Read};

/// Compress data using gzip
fn compress_data(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut encoder = GzEncoder::new(Vec::new(), Compression::best());
    encoder
        .write_all(data)
        .map_err(|e| format!("Failed to compress data: {}", e))?;
    encoder
        .finish()
        .map_err(|e| format!("Failed to finish compression: {}", e))
}

/// Decompress gzip data
fn decompress_data(data: &[u8]) -> Result<Vec<u8>, String> {
    let mut decoder = GzDecoder::new(data);
    let mut decompressed = Vec::new();
    decoder
        .read_to_end(&mut decompressed)
        .map_err(|e| format!("Failed to decompress data: {}", e))?;
    Ok(decompressed)
}

/// Generate QR code from data and return as base64-encoded PNG
#[tauri::command]
pub fn generate_qr(data: String, size: u32) -> Result<String, String> {
    // Validate size
    if size == 0 || size > 2048 {
        return Err("Size must be between 1 and 2048".to_string());
    }

    // Generate QR code
    let qr_code = QrCode::new(data.as_bytes())
        .map_err(|e| format!("Failed to generate QR code: {}", e))?;

    // Render to image
    let qr_image = qr_code.render::<Luma<u8>>()
        .min_dimensions(size, size)
        .max_dimensions(size, size)
        .build();

    // Convert to DynamicImage
    let dynamic_image = DynamicImage::ImageLuma8(qr_image);

    // Encode as PNG
    let mut png_bytes: Vec<u8> = Vec::new();
    dynamic_image
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    // Encode as base64
    let base64_image = general_purpose::STANDARD.encode(&png_bytes);

    // Return as data URL
    Ok(format!("data:image/png;base64,{}", base64_image))
}

/// Generate QR code with optional compression for large data
#[tauri::command]
pub fn generate_qr_compressed(data: String, size: u32, compress: bool) -> Result<String, String> {
    // Validate size
    if size == 0 || size > 2048 {
        return Err("Size must be between 1 and 2048".to_string());
    }

    // Prepare data (compress if requested and beneficial)
    let data_bytes = data.as_bytes();
    let (qr_data, _is_compressed) = if compress && data_bytes.len() > 100 {
        match compress_data(data_bytes) {
            Ok(compressed) => {
                // Only use compression if it actually reduces size
                if compressed.len() < data_bytes.len() {
                    // Prefix with 'C:' to indicate compression
                    let mut prefixed = b"C:".to_vec();
                    prefixed.extend_from_slice(&compressed);
                    (prefixed, true)
                } else {
                    (data_bytes.to_vec(), false)
                }
            }
            Err(_) => (data_bytes.to_vec(), false),
        }
    } else {
        (data_bytes.to_vec(), false)
    };

    // Encode as base64 for QR code
    let base64_data = general_purpose::STANDARD.encode(&qr_data);

    // Generate QR code from base64 string
    let qr_code = QrCode::new(base64_data.as_bytes())
        .map_err(|e| format!("Failed to generate QR code: {}", e))?;

    // Render to image
    let qr_image = qr_code.render::<Luma<u8>>()
        .min_dimensions(size, size)
        .max_dimensions(size, size)
        .build();

    // Convert to DynamicImage
    let dynamic_image = DynamicImage::ImageLuma8(qr_image);

    // Encode as PNG
    let mut png_bytes: Vec<u8> = Vec::new();
    dynamic_image
        .write_to(
            &mut std::io::Cursor::new(&mut png_bytes),
            image::ImageFormat::Png,
        )
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    // Encode as base64
    let base64_image = general_purpose::STANDARD.encode(&png_bytes);

    // Return as data URL
    Ok(format!("data:image/png;base64,{}", base64_image))
}

/// Decode compressed QR data
#[tauri::command]
pub fn decode_compressed_qr(data: String) -> Result<String, String> {
    // Decode from base64
    let decoded = general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Check if compressed (starts with 'C:')
    if decoded.len() > 2 && &decoded[0..2] == b"C:" {
        // Decompress
        let compressed = &decoded[2..];
        let decompressed = decompress_data(compressed)?;
        String::from_utf8(decompressed)
            .map_err(|e| format!("Failed to decode UTF-8: {}", e))
    } else {
        // Not compressed, return as-is
        String::from_utf8(decoded).map_err(|e| format!("Failed to decode UTF-8: {}", e))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generate_qr_basic() {
        let result = generate_qr("Hello, World!".to_string(), 200);
        assert!(result.is_ok());

        let qr_data = result.unwrap();
        assert!(qr_data.starts_with("data:image/png;base64,"));
    }

    #[test]
    fn test_generate_qr_invalid_size() {
        let result = generate_qr("test".to_string(), 0);
        assert!(result.is_err());

        let result = generate_qr("test".to_string(), 3000);
        assert!(result.is_err());
    }

    #[test]
    fn test_generate_qr_large_data() {
        // Test with a long string (like a PSBT)
        let long_data = "a".repeat(1000);
        let result = generate_qr(long_data, 400);
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_qr_bitcoin_address() {
        let address = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
        let result = generate_qr(address.to_string(), 256);
        assert!(result.is_ok());
    }

    #[test]
    fn test_compress_decompress() {
        let data = "Hello, World! This is a test string that will be compressed.".repeat(10);
        let compressed = compress_data(data.as_bytes()).unwrap();

        // Compression should reduce size
        assert!(compressed.len() < data.len());

        // Decompression should restore original
        let decompressed = decompress_data(&compressed).unwrap();
        assert_eq!(data.as_bytes(), decompressed.as_slice());
    }

    #[test]
    fn test_generate_qr_compressed() {
        let long_data = "a".repeat(500);
        let result = generate_qr_compressed(long_data.clone(), 400, true);
        assert!(result.is_ok());
    }

    #[test]
    fn test_generate_qr_uncompressed() {
        let short_data = "test";
        let result = generate_qr_compressed(short_data.to_string(), 200, false);
        assert!(result.is_ok());
    }

    #[test]
    fn test_decode_compressed_qr_roundtrip() {
        let original = "This is a test message that will be compressed and encoded".repeat(5);

        // Compress
        let compressed = compress_data(original.as_bytes()).unwrap();
        let mut prefixed = b"C:".to_vec();
        prefixed.extend_from_slice(&compressed);

        // Encode to base64
        let encoded = general_purpose::STANDARD.encode(&prefixed);

        // Decode
        let decoded = decode_compressed_qr(encoded).unwrap();

        assert_eq!(original, decoded);
    }

    #[test]
    fn test_decode_uncompressed_qr() {
        let original = "Simple message";
        let encoded = general_purpose::STANDARD.encode(original);
        let decoded = decode_compressed_qr(encoded).unwrap();
        assert_eq!(original, decoded);
    }
}
