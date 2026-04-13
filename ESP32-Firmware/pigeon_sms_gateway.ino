#define TINY_GSM_MODEM_SIM800
#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>

#define SerialMon Serial
#define SerialAT  Serial2

// ─── Configuration ──────────────────────────────────────────────────────────

// WiFi credentials (ESP32 uses WiFi to reach backend)
const char WIFI_SSID[]     = "FusionFi-2.4G";
const char WIFI_PASSWORD[] = "J#R8nKytg3@C%7FB59";

// Backend server (use ngrok URL for dev, real domain for prod)
const char BACKEND_HOST[] = "api.007575.xyz";  // e.g. "abcd1234.ngrok.io"
const int  BACKEND_PORT   = 443;                         // 443 for HTTPS, 3000 for local
const bool USE_HTTPS      = true;                        // set false for local dev (http)

// ESP32 device identifier
const char DEVICE_ID[] = "esp32-sim800l-01";

// SIM800L serial pins (adjust for your wiring)
const int SIM800_RX = 16;
const int SIM800_TX = 17;

// ─── Globals ────────────────────────────────────────────────────────────────

TinyGsm modem(SerialAT);

#include <WiFi.h>
#include <WiFiClientSecure.h>

// ─── WiFi Setup ─────────────────────────────────────────────────────────────

void connectWiFi() {
  SerialMon.print("Connecting to WiFi: ");
  SerialMon.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    SerialMon.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    SerialMon.println("\nWiFi connected!");
    SerialMon.print("IP: ");
    SerialMon.println(WiFi.localIP());
  } else {
    SerialMon.println("\nWiFi connection FAILED. Restarting...");
    ESP.restart();
  }
}

// ─── Send SMS via SIM800L ───────────────────────────────────────────────────

bool sendSMS(const String& to, const String& text) {
  SerialMon.print("[SIM800] Sending SMS to ");
  SerialMon.print(to);
  SerialMon.print(": ");
  SerialMon.println(text);

  bool ok = modem.sendSMS(to, text);

  if (ok) {
    SerialMon.println("[SIM800] SMS sent successfully");
  } else {
    SerialMon.println("[SIM800] SMS send FAILED");
  }
  return ok;
}

// ─── Forward SMS to Backend ─────────────────────────────────────────────────

String forwardToBackend(const String& from, const String& message) {
  SerialMon.println("[HTTP] Forwarding SMS to backend...");

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["from"]     = from;
  doc["message"]  = message;
  doc["deviceId"] = DEVICE_ID;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  SerialMon.print("[HTTP] Payload: ");
  SerialMon.println(jsonPayload);

  // Create appropriate client
  WiFiClient* client;
  WiFiClientSecure secureClient;
  WiFiClient plainClient;

  if (USE_HTTPS) {
    secureClient.setInsecure();  // Skip cert verification (use setCACert in prod)
    client = &secureClient;
  } else {
    client = &plainClient;
  }

  HttpClient http(*client, BACKEND_HOST, BACKEND_PORT);
  http.connectionKeepAlive();
  http.setTimeout(30000);  // 30s timeout (AI processing can take time)

  // POST to ESP32 webhook endpoint
  http.beginRequest();
  http.post("/api/esp32-sms-webhook");
  http.sendHeader("Content-Type", "application/json");
  http.sendHeader("Content-Length", jsonPayload.length());
  http.beginBody();
  http.print(jsonPayload);
  http.endRequest();

  // Read response
  int statusCode = http.responseStatusCode();
  String responseBody = http.responseBody();

  SerialMon.print("[HTTP] Status: ");
  SerialMon.println(statusCode);
  SerialMon.print("[HTTP] Response: ");
  SerialMon.println(responseBody);

  if (statusCode == 200) {
    // Parse reply from backend
    StaticJsonDocument<2048> resDoc;
    DeserializationError err = deserializeJson(resDoc, responseBody);

    if (err) {
      SerialMon.print("[HTTP] JSON parse error: ");
      SerialMon.println(err.c_str());
      return "";
    }

    bool success = resDoc["success"] | false;
    if (success) {
      const char* reply = resDoc["data"]["reply"];
      if (reply) {
        return String(reply);
      }
    }

    const char* error = resDoc["error"];
    if (error) {
      SerialMon.print("[HTTP] Backend error: ");
      SerialMon.println(error);
    }
  } else {
    SerialMon.print("[HTTP] Request failed with status: ");
    SerialMon.println(statusCode);
  }

  return "";
}

// ─── Parse Incoming SMS from SIM800L ────────────────────────────────────────

// +CMT: "+1234567890","","26/02/25,14:30:00+00"\r\nHello world
// We parse the sender number and the message body.

void parseAndProcessSMS(const String& rawData) {
  // Look for +CMT: header (SMS delivery in TEXT mode with AT+CNMI=2,2)
  int cmtIdx = rawData.indexOf("+CMT:");
  if (cmtIdx < 0) return;

  // Extract sender phone number between first pair of quotes
  int q1 = rawData.indexOf('"', cmtIdx);
  int q2 = rawData.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 < 0) return;

  String senderPhone = rawData.substring(q1 + 1, q2);

  // The message body starts after the header line's \n
  int bodyStart = rawData.indexOf('\n', cmtIdx);
  if (bodyStart < 0) return;

  String messageBody = rawData.substring(bodyStart + 1);
  messageBody.trim();

  if (senderPhone.length() == 0 || messageBody.length() == 0) return;

  SerialMon.println("─────────────────────────────────────");
  SerialMon.print("[SMS IN] From: ");
  SerialMon.println(senderPhone);
  SerialMon.print("[SMS IN] Body: ");
  SerialMon.println(messageBody);
  SerialMon.println("─────────────────────────────────────");

  // Ensure WiFi is still connected
  if (WiFi.status() != WL_CONNECTED) {
    SerialMon.println("[WARN] WiFi disconnected, reconnecting...");
    connectWiFi();
  }

  // Forward to backend for intent processing
  String reply = forwardToBackend(senderPhone, messageBody);

  // Send the AI-generated reply back via SIM800L
  if (reply.length() > 0) {
    // SIM800L has a ~160 char limit per SMS (or 70 for Unicode).
    // For long replies, split into multiple messages.
    const int MAX_SMS_LEN = 155;  // leave room for continuation markers

    if (reply.length() <= 160) {
      sendSMS(senderPhone, reply);
    } else {
      // Split long replies into chunks
      int totalParts = (reply.length() + MAX_SMS_LEN - 1) / MAX_SMS_LEN;
      for (int part = 0; part < totalParts; part++) {
        String chunk = reply.substring(part * MAX_SMS_LEN, (part + 1) * MAX_SMS_LEN);
        if (totalParts > 1) {
          chunk = "(" + String(part + 1) + "/" + String(totalParts) + ") " + chunk;
        }
        sendSMS(senderPhone, chunk);
        delay(2000);  // small delay between parts
      }
    }
  } else {
    SerialMon.println("[WARN] No reply from backend, not sending SMS");
  }
}

// ─── Setup ──────────────────────────────────────────────────────────────────

void setup() {
  SerialMon.begin(115200);
  delay(100);

  SerialMon.println();
  SerialMon.println("╔══════════════════════════════════════╗");
  SerialMon.println("║   PIGEON SMS Gateway — ESP32+SIM800  ║");
  SerialMon.println("╚══════════════════════════════════════╝");
  SerialMon.println();

  // 1. Connect to WiFi (for backend HTTP calls)
  connectWiFi();

  // 2. Initialize SIM800L modem
  SerialAT.begin(9600, SERIAL_8N1, SIM800_RX, SIM800_TX);
  delay(3000);

  SerialMon.println("[SIM800] Initializing modem...");
  modem.restart();
  delay(3000);

  String modemInfo = modem.getModemInfo();
  SerialMon.print("[SIM800] Modem Info: ");
  SerialMon.println(modemInfo);

  // Wait for network registration
  SerialMon.print("[SIM800] Waiting for network...");
  while (!modem.waitForNetwork(60000L)) {
    SerialMon.print(".");
    delay(1000);
  }
  SerialMon.println(" registered!");

  // Set SMS to TEXT mode
  SerialAT.println("AT+CMGF=1");
  delay(500);

  // Route incoming SMS directly to serial (no SIM storage)
  // AT+CNMI=2,2,0,0,0 → +CMT unsolicited result code delivered immediately
  SerialAT.println("AT+CNMI=2,2,0,0,0");
  delay(500);

  // Show extra SMS info (optional, for debugging)
  SerialAT.println("AT+CSDH=1");
  delay(500);

  SerialMon.println();
  SerialMon.println("[READY] PIGEON SMS Gateway is operational.");
  SerialMon.println("[READY] Waiting for incoming SMS...");
  SerialMon.println();
}

// ─── Main Loop ──────────────────────────────────────────────────────────────

// Buffer to accumulate serial data from SIM800L
String serialBuffer = "";
unsigned long lastDataTime = 0;
const unsigned long SMS_PARSE_DELAY = 500;  // ms to wait for complete message

void loop() {
  // Read data from SIM800L
  while (SerialAT.available()) {
    char c = SerialAT.read();
    serialBuffer += c;
    lastDataTime = millis();
  }

  // When we have buffered data and no new data for SMS_PARSE_DELAY ms,
  // attempt to parse it as an incoming SMS
  if (serialBuffer.length() > 0 && (millis() - lastDataTime > SMS_PARSE_DELAY)) {
    // Debug: print raw data
    SerialMon.print("[RAW] ");
    SerialMon.println(serialBuffer);

    // Check if this contains an incoming SMS (+CMT:)
    if (serialBuffer.indexOf("+CMT:") >= 0) {
      parseAndProcessSMS(serialBuffer);
    }

    serialBuffer = "";
  }

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    SerialMon.println("[WARN] WiFi lost, reconnecting...");
    connectWiFi();
  }

  delay(10);  // small yield
}
