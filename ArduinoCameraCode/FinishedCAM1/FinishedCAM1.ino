/*IMPORTANT NOTE: This code can function for other cameras, however, the camera/board module MUST have PSRAM. 
If the camera/board module does not have PSRAM, the camera will not be able to initialize.*/

#include "esp_camera.h"
#include <WiFi.h>
#include <WebSocketsClient.h>

// Camera model -> Using ESP32 CAM
#define CAMERA_MODEL_AI_THINKER
#define PWDN_GPIO_NUM    32
#define RESET_GPIO_NUM   -1
#define XCLK_GPIO_NUM    0
#define SIOD_GPIO_NUM    26
#define SIOC_GPIO_NUM    27
#define Y9_GPIO_NUM      35
#define Y8_GPIO_NUM      34
#define Y7_GPIO_NUM      39
#define Y6_GPIO_NUM      36
#define Y5_GPIO_NUM      21
#define Y4_GPIO_NUM      19
#define Y3_GPIO_NUM      18
#define Y2_GPIO_NUM      5
#define VSYNC_GPIO_NUM   25
#define HREF_GPIO_NUM    23s
#define PCLK_GPIO_NUM    22

// WiFi and WebSocket server credentials
const char* ssid = "enter-your-hotspot-name"; // Enter correct credentials
const char* password = "enter-your-hotspot-password";
const char* webSocketServer = "enter-your-websocket-server";// Enter correct WebSocket server

//Create WebSocketClient
WebSocketsClient webSocket;

int identifier = 1; //Camera 2 identifier
const int buttonPin = 12; // Button pin
volatile bool buttonPressed = false; // Button press flag
unsigned long lastDebounceTime = 0;
const unsigned long debounceDelay = 1000; // Debounce time in ms

// Interrupt function, so any button press is handle immediately. Button presses occuring within 1sec of original press are disregarded
void IRAM_ATTR handleButtonPress() {
    unsigned long currentTime = millis();
    if ((currentTime - lastDebounceTime) > debounceDelay) {
        buttonPressed = true;
        lastDebounceTime = currentTime;
    }
}

// Initialize camera
void initCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = Y2_GPIO_NUM;
    config.pin_d1 = Y3_GPIO_NUM;
    config.pin_d2 = Y4_GPIO_NUM;
    config.pin_d3 = Y5_GPIO_NUM;
    config.pin_d4 = Y6_GPIO_NUM;
    config.pin_d5 = Y7_GPIO_NUM;
    config.pin_d6 = Y8_GPIO_NUM;
    config.pin_d7 = Y9_GPIO_NUM;
    config.pin_xclk = XCLK_GPIO_NUM;
    config.pin_pclk = PCLK_GPIO_NUM;
    config.pin_vsync = VSYNC_GPIO_NUM;
    config.pin_href = HREF_GPIO_NUM;
    config.pin_sccb_sda = SIOD_GPIO_NUM;
    config.pin_sccb_scl = SIOC_GPIO_NUM;
    config.pin_pwdn = PWDN_GPIO_NUM;
    config.pin_reset = RESET_GPIO_NUM;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG; 
    config.frame_size = FRAMESIZE_QVGA; //lowere quality for smoother stream
    config.jpeg_quality = 10; 
    config.fb_count = 2; 

    if (psramFound()) {
        config.jpeg_quality = 10;
        config.fb_count = 2;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x", err);
        while (true);
    }

    // Adjust the camera settings for brightness
    sensor_t * s = esp_camera_sensor_get();
    
    // Increase brightness
    s->set_brightness(s, 1);
}

// Function that sends captured frames and cam identifier to streaming website via WebSocket
void sendVideoFrame(int identifier) {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        return;
    }
    if (webSocket.isConnected()) {
        // Allocate a new buffer to include the identifier
        size_t totalLength = fb->len + 1;
        uint8_t* frameBuffer = new uint8_t[totalLength];
        frameBuffer[0] = identifier; // Add identifier as the first byte
        memcpy(frameBuffer + 1, fb->buf, fb->len); // Copy frame data after the identifier

        webSocket.sendBIN(frameBuffer, totalLength); // Send the modified buffer
        delete[] frameBuffer; // Clean up
    }
    esp_camera_fb_return(fb);
}


// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
    case WStype_DISCONNECTED:
        Serial.println("Disconnected from WebSocket server.");
        break;
    case WStype_CONNECTED:
        Serial.println("Connected to WebSocket server!");
        break;
    case WStype_TEXT:
        Serial.printf("Received message: %s\n", payload);
        break;
    default:
        break;
    }
}

void setup() {
    Serial.begin(115200);

    // Attach button to pin, and attach interrupt function to buttonpin
    pinMode(buttonPin, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(buttonPin), handleButtonPress, FALLING);

    // Connect to wifi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    // Initialize camera
    initCamera();

    // Initialize WebSocket
    webSocket.beginSSL(webSocketServer, 443, "/");
    webSocket.onEvent(webSocketEvent);

    Serial.println("Setup complete");
}

void loop() {
    // Keep WebSocket alive
    webSocket.loop();

    // Check if the button was pressed and the WebSocket is connected
    if (buttonPressed && webSocket.isConnected()) {
        buttonPressed = false;
        webSocket.sendTXT("{\"box\":\"videoBox1\"}"); // specifcally box 1
        Serial.println("Button press sent");
    }
    // Send camera frames
    sendVideoFrame(identifier);
}
