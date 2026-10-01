# Kiloview NDI

This module will allow you to control Kiloview NDI encoders/decoders (N40, N5, N6).

## Configuration

- **IP Address**: the IP address of the device.
- **Use Authentication**: enable this if the device requires a login, and enter the **Username** and **Password**. The user must have HTTP API access enabled on the device. If the device rejects requests with authentication turned off, the log will tell you to enable it.
- **Default Mode**: the mode (Encoder/Decoder) to assume until the device reports its actual mode. Once connected, actions, feedbacks, variables and presets update automatically to match the device's mode.
- **Enable Polling**: required for feedbacks and variables to update.
    - **Polling Rate for Current State**: in milliseconds. Values below 1000 or that aren't a number fall back to 1000.
    - **Polling Rate for new NDI Sources** (decoder only): in milliseconds. Values below 1000 or that aren't a number fall back to 10000.
- **Enable Picture Management Functions**: adds actions to change or reset the images the device displays.

## Actions

- Set Mode / Toggle Mode
- Reboot Device
- Reset all NDI Connections
- Restore to Factory Settings
- Encoder Actions:
    - Set NDI Type (TCP/Multicast)
    - Set Audio Signal Type (Embedded/Analog)
    - Set Audio Volume (0-200)
- Decoder Actions:
    - Set Preset (1-9)
    - Select NDI Source
    - Refresh NDI Sources
    - Set Output Resolution
    - Set Output Frame Rate
    - Set Output Audio Sample Rate
- Picture Management Actions (when enabled):
    - Change Image: upload an image file from the Companion computer for No Signal, Decoding Mode, Unsupported Codec or Unsupported Resolution. The path supports variables.
    - Reset Image: restore the device's default image

## Feedbacks

- Converter Mode is [Encoder/Decoder]
- Encoder Feedbacks:
    - Encoder Video Signal is Online/Offline
    - Encoder Audio Source is Online/Offline
- Decoder Feedbacks:
    - Selected NDI Source is Online/Offline
    - Selected Preset is Enabled
    - Selected Preset is Current Preset

## Variables

- Current Converter Mode
- Authorized User
- Resolution
- Audio Format
- Encoder Variables:
    - Video Signal Present
    - NDI Bitrate
- Decoder Variables:
    - NDI Codec
    - NDI Stream Name
    - NDI Source Online
    - For each preset 1-9: Enabled, Group, Name, Device Name, Channel Name, URL, IP, Online, Current
- System Info:
    - CPU Cores
    - CPU Payload
    - Memory Used
    - Memory Total
    - Device Start Time
    - Device Uptime

## Presets

- General: Set Converter Mode to Encoder/Decoder, Toggle Converter Mode, Display Current Mode, Resolution, Bitrate
- Encoder: Encoder status
- Decoder: Online State, Go to Preset 1-9
