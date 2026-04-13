# SMS Gateway Setup — httpSMS

## Overview

PIGEON uses [httpSMS](https://httpsms.com) to turn an Android phone into an SMS gateway.  
Incoming SMS → httpSMS webhook → PIGEON backend (AI intent) → reply SMS via httpSMS API.

## Setup

### 1. Install httpSMS Android App
- Download from [Google Play](https://play.google.com/store/apps/details?id=com.httpsms)
- Sign in and note your **API Key** from the httpSMS dashboard

### 2. Configure Environment
```bash
# In Backend/.env
HTTPSMS_API_KEY=your_api_key_from_httpsms_dashboard
HTTPSMS_OWNER_PHONE=+1234567890   # your Android phone number
HTTPSMS_WEBHOOK_SIGNING_KEY=your_signing_key  # optional, for JWT validation
```

### 3. Configure Webhook in httpSMS Dashboard
- Go to **Settings > Webhooks** at [httpsms.com/settings](https://httpsms.com/settings#webhooks)
- **Callback URL**: `https://your-server.com/api/sms-webhook`
- **Events**: Select `message.phone.received`
- **Signing Key**: Set a secret (match `HTTPSMS_WEBHOOK_SIGNING_KEY` in `.env`)

### 4. Expose Backend (Development)
```bash
# Use ngrok or similar tunnel for local development
ngrok http 3000
# Use the HTTPS URL as your webhook callback URL
```

## How It Works

```
User sends SMS → Android phone → httpSMS cloud → POST /api/sms-webhook
                                                        ↓
                                              Parse CloudEvents payload
                                                        ↓
                                              NVIDIA NIM AI intent classifier
                                                        ↓
                                              Execute action (balance, address, etc.)
                                                        ↓
                                              Reply via httpSMS Send API → SMS back to user
```

## httpSMS Payload Format

httpSMS sends **CloudEvents** formatted webhooks:

```json
{
  "data": {
    "contact": "+18005550100",
    "content": "balance",
    "message_id": "0b0123bb-...",
    "owner": "+18005550199",
    "sim": "SIM1",
    "timestamp": "2023-06-29T03:21:19.814Z",
    "user_id": "XtABz6..."
  },
  "id": "f4aed1d3-...",
  "source": "/v1/messages/receive",
  "specversion": "1.0",
  "time": "2023-06-29T03:21:19.524Z",
  "type": "message.phone.received"
}
```

## Testing

```bash
# Health check
curl http://localhost:3000/api/webhook-health

# Simulate incoming SMS
curl -X POST http://localhost:3000/api/sms-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "contact": "+18005550100",
      "content": "balance",
      "message_id": "test-001",
      "owner": "+18005550199",
      "sim": "SIM1",
      "timestamp": "2023-06-29T03:21:19.814Z",
      "user_id": "test-user"
    },
    "datacontenttype": "application/json",
    "id": "test-event-001",
    "source": "/v1/messages/receive",
    "specversion": "1.0",
    "time": "2023-06-29T03:21:19.524Z",
    "type": "message.phone.received"
  }'
```

## ESP32 + SIM800L Gateway (Alternative)

Instead of httpSMS (requires Android phone), you can use an **ESP32 + SIM800L** hardware module as the SMS gateway.

### Hardware Required
- ESP32 dev board
- SIM800L GSM module
- SIM card with SMS plan
- Power supply (SIM800L needs 3.7–4.2V, NOT 3.3V from ESP32)

### Wiring
| SIM800L | ESP32 |
|---------|-------|
| TX      | GPIO 16 (RX2) |
| RX      | GPIO 17 (TX2) |
| GND     | GND   |
| VCC     | External 4V supply |

### Firmware Setup
1. Open `ESP32-Firmware/pigeon_sms_gateway.ino` in Arduino IDE
2. Install libraries: **TinyGSM**, **ArduinoHttpClient**, **ArduinoJson**
3. Set your WiFi credentials, backend URL, and device ID
4. Flash to ESP32

### How It Works
```
User sends SMS → SIM800L → ESP32 parses +CMT → HTTP POST /api/esp32-sms-webhook
                                                        ↓
                                              NVIDIA NIM AI intent classifier
                                                        ↓
                                              Execute action (balance, send, etc.)
                                                        ↓
                                              JSON reply → ESP32 → SIM800L sends SMS back
```

### ESP32 Webhook Endpoint
- **URL**: `POST /api/esp32-sms-webhook`
- **Payload**: `{ "from": "+1234567890", "message": "balance", "deviceId": "esp32-01" }`
- **Response**: `{ "success": true, "data": { "reply": "💰 Balance: 5.5 ALGO", "send_reply": true } }`

### Testing
```bash
# Simulate ESP32 SMS forwarding
curl -X POST http://localhost:3000/api/esp32-sms-webhook \
  -H "Content-Type: application/json" \
  -d '{"from": "+1234567890", "message": "balance", "deviceId": "esp32-test"}'
```

## Security

- **JWT Validation**: Set `HTTPSMS_WEBHOOK_SIGNING_KEY` to validate the `Authorization` Bearer token on each webhook request (HS256 signed)
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: httpSMS has a 5-second timeout per webhook; respond quickly

## Supported SMS Commands

| Command | Example | Note |
|---------|---------|------|
| Balance | "balance", "how much ALGO" | Returns wallet balance |
| Address | "my address", "get address" | Returns wallet address |
| Send | "send 1 ALGO to ..." | Redirected to mobile app (security) |
| Onboard | "create wallet" | Redirected to mobile app (security) |

> **Note**: Send and onboard require password-protected wallet access, so they are only available through the PIGEON mobile app.
