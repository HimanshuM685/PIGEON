#define TINY_GSM_MODEM_SIM800

#include <TinyGsmClient.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <mbedtls/base64.h>

#define SerialMon Serial
#define SerialAT Serial2

const char WIFI_SSID[] = "YOUR SSID HERE";
const char WIFI_PASSWORD[] = "YOUR PASSWORD HERE";

const char ALGOD_HOST[] = "testnet-api.4160.nodely.dev";
const int ALGOD_PORT = 443;

const char DEVICE_ID[] = "esp32-sim800l-01";

const int SIM800_RX = 16;
const int SIM800_TX = 17;

const uint32_t HTTP_TIMEOUT_MS = 30000;
const int MAX_REPLY_SMS_LEN = 155;

TinyGsm modem(SerialAT);

String serialBuffer = "";
unsigned long lastDataTime = 0;
const unsigned long SMS_PARSE_DELAY_MS = 500;

void connectWiFi() {
  SerialMon.print("[WiFi] Connecting to ");
  SerialMon.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 40) {
    delay(500);
    SerialMon.print(".");
    retries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    SerialMon.println("\n[WiFi] Connected");
    SerialMon.print("[WiFi] IP: ");
    SerialMon.println(WiFi.localIP());
  } else {
    SerialMon.println("\n[WiFi] Failed, restarting device");
    ESP.restart();
  }
}

bool sendSMS(const String &to, const String &text) {
  SerialMon.print("[SIM800] Sending SMS to ");
  SerialMon.println(to);

  bool ok = modem.sendSMS(to, text);
  SerialMon.println(ok ? "[SIM800] SMS sent" : "[SIM800] SMS failed");
  return ok;
}

void sendLongSMS(const String &to, const String &text) {
  if (text.length() <= 160) {
    sendSMS(to, text);
    return;
  }

  int totalParts = (text.length() + MAX_REPLY_SMS_LEN - 1) / MAX_REPLY_SMS_LEN;
  for (int part = 0; part < totalParts; part++) {
    String chunk = text.substring(part * MAX_REPLY_SMS_LEN, (part + 1) * MAX_REPLY_SMS_LEN);
    if (totalParts > 1) {
      chunk = "(" + String(part + 1) + "/" + String(totalParts) + ") " + chunk;
    }
    sendSMS(to, chunk);
    delay(1500);
  }
}

bool algodGet(const String &path, int &statusCode, String &responseBody) {
  WiFiClientSecure client;
  client.setInsecure();

  HttpClient http(client, ALGOD_HOST, ALGOD_PORT);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.connectionKeepAlive();

  http.get(path);
  statusCode = http.responseStatusCode();
  responseBody = http.responseBody();

  SerialMon.print("[ALGOD] GET ");
  SerialMon.print(path);
  SerialMon.print(" -> ");
  SerialMon.println(statusCode);

  return statusCode >= 200 && statusCode < 300;
}

bool algodPostBinary(const String &path, const uint8_t *payload, size_t payloadLen, int &statusCode, String &responseBody) {
  WiFiClientSecure client;
  client.setInsecure();

  HttpClient http(client, ALGOD_HOST, ALGOD_PORT);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.connectionKeepAlive();

  http.beginRequest();
  http.post(path);
  http.sendHeader("Content-Type", "application/x-binary");
  http.sendHeader("Accept", "application/json");
  http.sendHeader("Content-Length", payloadLen);
  http.beginBody();
  http.write(payload, payloadLen);
  http.endRequest();

  statusCode = http.responseStatusCode();
  responseBody = http.responseBody();

  SerialMon.print("[ALGOD] POST ");
  SerialMon.print(path);
  SerialMon.print(" -> ");
  SerialMon.println(statusCode);

  return statusCode >= 200 && statusCode < 300;
}

String getStatusSummary() {
  int statusCode = 0;
  String body;
  if (!algodGet("/v2/status", statusCode, body)) {
    return "STATUS failed: HTTP " + String(statusCode);
  }

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    return "STATUS parse error";
  }

  uint64_t lastRound = doc["last-round"] | 0;
  const char *nodeVersion = doc["version"] | "unknown";
  return "TESTNET OK round=" + String((unsigned long)lastRound) + " version=" + String(nodeVersion);
}

String submitSignedTransaction(const String &signedTxnB64) {
  String clean = signedTxnB64;
  clean.replace("\r", "");
  clean.replace("\n", "");
  clean.trim();

  if (clean.length() == 0) {
    return "SENDTX failed: empty payload";
  }

  size_t outLen = 0;
  int sizeResult = mbedtls_base64_decode(nullptr, 0, &outLen, reinterpret_cast<const unsigned char *>(clean.c_str()), clean.length());
  if (sizeResult != MBEDTLS_ERR_BASE64_BUFFER_TOO_SMALL || outLen == 0 || outLen > 4096) {
    return "SENDTX failed: invalid base64";
  }

  uint8_t *txBytes = static_cast<uint8_t *>(malloc(outLen));
  if (!txBytes) {
    return "SENDTX failed: OOM";
  }

  size_t decodedLen = 0;
  int decodeResult = mbedtls_base64_decode(txBytes, outLen, &decodedLen, reinterpret_cast<const unsigned char *>(clean.c_str()), clean.length());
  if (decodeResult != 0 || decodedLen == 0) {
    free(txBytes);
    return "SENDTX failed: decode error";
  }

  int statusCode = 0;
  String responseBody;
  bool ok = algodPostBinary("/v2/transactions", txBytes, decodedLen, statusCode, responseBody);
  free(txBytes);

  if (!ok) {
    return "SENDTX failed: HTTP " + String(statusCode);
  }

  StaticJsonDocument<512> resDoc;
  DeserializationError err = deserializeJson(resDoc, responseBody);
  if (err) {
    return "SENDTX ok but parse failed";
  }

  const char *txId = resDoc["txId"] | "";
  if (strlen(txId) == 0) {
    return "SENDTX ok but txId missing";
  }

  return "TX submitted: " + String(txId);
}

String getPendingSummary(const String &txId) {
  if (txId.length() == 0) {
    return "PENDING failed: missing txid";
  }

  int statusCode = 0;
  String body;
  String path = "/v2/transactions/pending/" + txId;
  if (!algodGet(path, statusCode, body)) {
    return "PENDING failed: HTTP " + String(statusCode);
  }

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    return "PENDING parse error";
  }

  uint64_t confirmedRound = doc["confirmed-round"] | 0;
  const char *poolError = doc["pool-error"] | "";

  if (confirmedRound > 0) {
    return "CONFIRMED round=" + String((unsigned long)confirmedRound);
  }

  if (strlen(poolError) > 0) {
    return "PENDING error: " + String(poolError);
  }

  return "PENDING: not confirmed yet";
}

String processCommand(const String &messageBody) {
  String msg = messageBody;
  msg.trim();

  if (msg.length() == 0) {
    return "Empty command";
  }

  String upper = msg;
  upper.toUpperCase();

  if (upper == "HELP") {
    return "Commands: STATUS | SENDTX <base64> | PENDING <txid>";
  }

  if (upper == "STATUS") {
    return getStatusSummary();
  }

  if (upper.startsWith("PENDING ")) {
    String txId = msg.substring(8);
    txId.trim();
    return getPendingSummary(txId);
  }

  if (upper.startsWith("SENDTX ")) {
    String b64 = msg.substring(7);
    b64.trim();
    return submitSignedTransaction(b64);
  }

  return "Unknown command. Send HELP";
}

void parseAndProcessSMS(const String &rawData) {
  int cmtIdx = rawData.indexOf("+CMT:");
  if (cmtIdx < 0) {
    return;
  }

  int q1 = rawData.indexOf('"', cmtIdx);
  int q2 = rawData.indexOf('"', q1 + 1);
  if (q1 < 0 || q2 < 0) {
    return;
  }

  String senderPhone = rawData.substring(q1 + 1, q2);

  int bodyStart = rawData.indexOf('\n', cmtIdx);
  if (bodyStart < 0) {
    return;
  }

  String messageBody = rawData.substring(bodyStart + 1);
  messageBody.trim();

  if (senderPhone.length() == 0 || messageBody.length() == 0) {
    return;
  }

  SerialMon.println("----------------------------------------");
  SerialMon.print("[SMS IN] From: ");
  SerialMon.println(senderPhone);
  SerialMon.print("[SMS IN] Body: ");
  SerialMon.println(messageBody);
  SerialMon.println("----------------------------------------");

  if (WiFi.status() != WL_CONNECTED) {
    SerialMon.println("[WARN] WiFi disconnected, reconnecting");
    connectWiFi();
  }

  String reply = processCommand(messageBody);
  sendLongSMS(senderPhone, reply);
}

void setup() {
  SerialMon.begin(115200);
  delay(100);

  SerialMon.println();
  SerialMon.println("PIGEON ESP32 + SIM800 RPC gateway (TestNet)");

  connectWiFi();

  SerialAT.begin(9600, SERIAL_8N1, SIM800_RX, SIM800_TX);
  delay(3000);

  SerialMon.println("[SIM800] Initializing modem");
  modem.restart();
  delay(3000);

  String modemInfo = modem.getModemInfo();
  SerialMon.print("[SIM800] Modem Info: ");
  SerialMon.println(modemInfo);

  SerialMon.print("[SIM800] Waiting for network");
  while (!modem.waitForNetwork(60000L)) {
    SerialMon.print(".");
    delay(1000);
  }
  SerialMon.println(" registered");

  SerialAT.println("AT+CMGF=1");
  delay(500);
  SerialAT.println("AT+CNMI=2,2,0,0,0");
  delay(500);
  SerialAT.println("AT+CSDH=1");
  delay(500);

  SerialMon.println("[READY] Waiting for incoming SMS commands");
  SerialMon.println("[READY] Commands: STATUS | SENDTX <base64> | PENDING <txid>");
}

void loop() {
  while (SerialAT.available()) {
    char c = static_cast<char>(SerialAT.read());
    serialBuffer += c;
    lastDataTime = millis();
  }

  if (serialBuffer.length() > 0 && (millis() - lastDataTime > SMS_PARSE_DELAY_MS)) {
    SerialMon.print("[RAW] ");
    SerialMon.println(serialBuffer);

    if (serialBuffer.indexOf("+CMT:") >= 0) {
      parseAndProcessSMS(serialBuffer);
    }

    serialBuffer = "";
  }

  if (WiFi.status() != WL_CONNECTED) {
    SerialMon.println("[WARN] WiFi lost, reconnecting");
    connectWiFi();
  }

  delay(10);
}
