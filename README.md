# Arduino LiveStream Website

This project showcases a live streaming security camera system utilizing Arduino, featuring two ESP32 CAM modules. These cameras seamlessly connect to Wi-Fi, broadcasting video in real-time via WebSockets to a streaming website hosted on Glitch.com. The web interface not only displays the live feeds but also offers functionalities for incident logging and system resetting.

## Features

- **Live streaming from two Arduino ESP32 cameras**
- **Real-time incident logging and notifications via Arduino buttons**
- **WebSocket communication for live updates**
- **Friendly user-interface for control over system**
- **System reset functionality to clear logs and refresh the setup**

## Demonstration

Video!

## Arduino Setup

### Hardware Requirements

<div style="display: flex; align-items: flex-start;">
  <ul>
    <li>2 x Arduino boards</li>
    <li>2 x ESP32-CAM modules</li>
    <li>Female-to-female wires</li>
    <li>2 x TTL serial adapters</li>
    <li>2 x Buttons</li>
    <li>2 x 10K Ohm resistors</li>
  </ul>
  
  <img src="https://github.com/user-attachments/assets/9c30fbe0-68a1-4d2e-a2d1-c76b9963bdbe" alt="File Structure Screenshot" width="500px" style="margin-right: 20px;">
</div>


### Install ESP-32 Library on Arduino IDE:

1. **Add Board Manager URL**:
   - Go to `Tools > Board > Boards Manager > File > Preferences`
   - In the "Additional Board Manager URLs" field, add:
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
2. **Install the ESP32 Board**:
   - In the Boards Manager, install "ESP32 by Espressif Systems"

### Code

1. **Upload the Arduino sketch**:
    - Compile the provided Arduino sketch.
    - Select correct ESP32 board (try Wrover Kit(all versions))
    - Turn on Hotspot and upload sketches.

## Web Interface

The web interface is built using Express.js and serves the following purposes:

- **Display Live Streams**: Shows the video feed from the ESP32 cameras.
- **Log Incidents**: When the button of the respective cameras are pressed, an incident report is logged, and only resolved when the user clicks the resolved button under the associated camera feed. 
- **Reset System**: Provides a reset button to clear logs and refresh the system.


### Hosting Your Own Version

To host your own version of the website, you can use Glitch.com by following these steps:
   - Visit [Glitch](https://glitch.com/).
   - Create a new project.
   - Copy all files from the `app` folder in this repository to your Glitch project.

The structure of the website should resemble the following file structure:

<img align="left" src="https://github.com/user-attachments/assets/03663203-2fb7-46b0-8106-a9b4ced15303" alt="File Structure Screenshot" width="300px">
