# SMS Gateway Setup — SMSGate

## Overview

PIGEON uses [SMSGate](https://sms-gate.app/) to turn an Android phone into an SMS gateway.  
Incoming SMS → SMSGate webhook → PIGEON backend (AI intent) → reply SMS via SMSGate API.

## Setup

### 1. Install SMSGate Android App
- Download from [Google Play](https://play.google.com/store/apps/details?id=app.sms_gate) or [GitHub Releases](https://github.com/capcom6/sms-gateway/releases)
- Create an account and note your **username** and **password**

### 2. Configure Environment
```bash
# In Backend/.env
SMSGATE_BASE_URL=https://api.sms-gate.app       # or your self-hosted URL
SMSGATE_USERNAME=your_smsgate_username
SMSGATE_PASSWORD=your_smsgate_password
```

### 3. Configure Webhook in SMSGate
Register a webhook via the SMSGate API:

```bash
curl -X POST https://api.sms-gate.app/3rdparty/v1/webhooks \
  -u "your_username:your_password" \
  -H "Content-Type: application/json" \
  -d '{
    "event": "sms:received",
    "url": "https://your-server.com/api/sms-webhook"
  }'
```

Or configure via the SMSGate Android app settings.

**Events to subscribe to:** `sms:received`

### 4. Expose Backend (Development)
```bash
# Use ngrok or similar tunnel for local development
ngrok http 3000
# Use the HTTPS URL as your webhook callback URL
```

## How It Works

```
User sends SMS → Android phone → SMSGate cloud → POST /api/sms-webhook
                                                        ↓
                                              Parse IncomingMessage payload
                                                        ↓
                                              OpenRouter AI intent classifier
                                                        ↓
                                              Execute action (balance, address, etc.)
                                                        ↓
                                              Reply via SMSGate Send API → SMS back to user
```

## SMSGate Webhook Payload Format

SMSGate `sms:received` webhook sends an **IncomingMessage** object:

```json
{
  "id": "PyDmBQZZXYmyxMwED8Fzy",
  "sender": "+18005550100",
  "contentPreview": "balance",
  "type": "SMS",
  "createdAt": "2024-01-01T00:00:00Z",
  "recipient": "+18005550199",
  "simNumber": 1
}
```

## SMSGate Send API

To send an SMS reply, PIGEON calls `POST /3rdparty/v1/messages` with Basic Auth:

```bash
curl -X POST https://api.sms-gate.app/3rdparty/v1/messages \
  -u "your_username:your_password" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumbers": ["+18005550100"],
    "message": "Your ALGO balance is 5.5 ALGO"
  }'
```

**Authentication:** HTTP Basic Auth (`Authorization: Basic base64(username:password)`)

## Testing

```bash
# Health check
curl http://localhost:3000/api/webhook-health

# Simulate incoming SMS (SMSGate sms:received format)
curl -X POST http://localhost:3000/api/sms-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-msg-001",
    "sender": "+18005550100",
    "contentPreview": "balance",
    "type": "SMS",
    "createdAt": "2024-01-01T00:00:00Z",
    "recipient": "+18005550199",
    "simNumber": 1
  }'
```

## ESP32 + SIM800L Gateway (Alternative)

Instead of SMSGate (requires Android phone), you can use an **ESP32 + SIM800L** hardware module as the SMS gateway.

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
                                              OpenRouter AI intent classifier
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

- **Basic Auth**: SMSGate API and webhook validation use HTTP Basic Auth — credentials are sent base64-encoded over HTTPS
- **HTTPS**: Always use HTTPS in production
- **Rate Limiting**: Configure message sending limits via SMSGate settings API (`POST /3rdparty/v1/settings`)
- **Concurrency**: The backend limits concurrent SMS processing to 5 simultaneous sessions. Additional requests are queued automatically.

## SMSGate API Reference

Full API documentation: [https://docs.sms-gate.app/](https://docs.sms-gate.app/)

Key endpoints used by PIGEON:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/3rdparty/v1/messages` | POST | Send SMS messages |
| `/3rdparty/v1/messages/{id}` | GET | Check message delivery status |
| `/3rdparty/v1/devices` | GET | List registered Android devices |
| `/3rdparty/v1/webhooks` | POST | Register webhook for incoming SMS |
| `/3rdparty/v1/webhooks` | GET | List registered webhooks |
| `/3rdparty/v1/health` | GET | API health/readiness check |

## Supported SMS Commands

| Command | Example | Note |
|---------|---------|------|
| Balance | "balance", "how much ALGO" | Returns wallet balance |
| Address | "my address", "get address" | Returns wallet address |
| Send | "send 1 ALGO to ..." | Requires password (two-step flow) |
| Onboard | "create wallet" | Requires password (two-step flow) |
| Fund | "fund me" | Request testnet ALGO |
| Transactions | "get txn" | Show last 5 transactions |
| Export Key | "get pvt key" | Requires password (two-step flow) |
