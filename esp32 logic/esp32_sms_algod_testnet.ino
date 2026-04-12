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

const int SIM800_RX = 16;
const int SIM800_TX = 17;

const uint32_t HTTP_TIMEOUT_MS = 30000;
const int MAX_REPLY_SMS_LEN = 155;

uint64_t currentAppId = 0;

TinyGsm modem(SerialAT);

String serialBuffer = "";
unsigned long lastDataTime = 0;
const unsigned long SMS_PARSE_DELAY_MS = 500;

String u64ToString(uint64_t value) {
  char buf[32];
  snprintf(buf, sizeof(buf), "%llu", static_cast<unsigned long long>(value));
  return String(buf);
}

String urlEncode(const String &input) {
  String out = "";
  for (size_t i = 0; i < input.length(); i++) {
    char c = input[i];
    bool safe =
      (c >= 'A' && c <= 'Z') ||
      (c >= 'a' && c <= 'z') ||
      (c >= '0' && c <= '9') ||
      c == '-' || c == '_' || c == '.' || c == '~';

    if (safe) {
      out += c;
    } else {
      char hex[4];
      snprintf(hex, sizeof(hex), "%%%02X", static_cast<unsigned char>(c));
      out += hex;
    }
  }
  return out;
}

String normalizePhone(const String &in) {
  String out = "";
  for (size_t i = 0; i < in.length(); i++) {
    char c = in[i];
    if (c >= '0' && c <= '9') {
      out += c;
    }
  }
  return out;
}

bool base64Encode(const uint8_t *in, size_t inLen, String &out) {
  size_t needed = 0;
  int r = mbedtls_base64_encode(nullptr, 0, &needed, in, inLen);
  if (r != MBEDTLS_ERR_BASE64_BUFFER_TOO_SMALL || needed == 0) {
    return false;
  }

  unsigned char *buf = static_cast<unsigned char *>(malloc(needed + 1));
  if (!buf) {
    return false;
  }

  size_t written = 0;
  r = mbedtls_base64_encode(buf, needed, &written, in, inLen);
  if (r != 0 || written == 0) {
    free(buf);
    return false;
  }

  buf[written] = '\0';
  out = String(reinterpret_cast<char *>(buf));
  free(buf);
  return true;
}

bool base64Decode(const String &in, uint8_t *&out, size_t &outLen) {
  out = nullptr;
  outLen = 0;

  String clean = in;
  clean.replace("\r", "");
  clean.replace("\n", "");
  clean.trim();

  if (clean.length() == 0) {
    return false;
  }

  int r = mbedtls_base64_decode(nullptr, 0, &outLen, reinterpret_cast<const unsigned char *>(clean.c_str()), clean.length());
  if (r != MBEDTLS_ERR_BASE64_BUFFER_TOO_SMALL || outLen == 0 || outLen > 8192) {
    return false;
  }

  out = static_cast<uint8_t *>(malloc(outLen));
  if (!out) {
    return false;
  }

  size_t written = 0;
  r = mbedtls_base64_decode(out, outLen, &written, reinterpret_cast<const unsigned char *>(clean.c_str()), clean.length());
  if (r != 0 || written == 0) {
    free(out);
    out = nullptr;
    outLen = 0;
    return false;
  }

  outLen = written;
  return true;
}

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

bool ensureAppIdSet(String &err) {
  if (currentAppId == 0) {
    err = "Set APPID first. e.g. APPID 123456";
    return false;
  }
  return true;
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
  return "TESTNET OK round=" + u64ToString(lastRound) + " version=" + String(nodeVersion);
}

bool getTotalUsers(uint64_t &totalUsers, String &err) {
  if (!ensureAppIdSet(err)) {
    return false;
  }

  int statusCode = 0;
  String body;
  String path = "/v2/applications/" + u64ToString(currentAppId);
  if (!algodGet(path, statusCode, body)) {
    err = "TOTAL failed: HTTP " + String(statusCode);
    return false;
  }

  StaticJsonDocument<4096> doc;
  DeserializationError parseErr = deserializeJson(doc, body);
  if (parseErr) {
    err = "TOTAL parse error";
    return false;
  }

  JsonArray gs = doc["params"]["global-state"].as<JsonArray>();
  if (gs.isNull()) {
    err = "TOTAL not found";
    return false;
  }

  const char *targetKey = "dG90YWxVc2Vycw==";
  for (JsonObject item : gs) {
    const char *key = item["key"] | "";
    if (strcmp(key, targetKey) == 0) {
      totalUsers = item["value"]["uint"] | 0;
      return true;
    }
  }

  err = "TOTAL key missing";
  return false;
}

bool makeUserBoxPath(const String &phoneDigits, String &path, String &err) {
  if (!ensureAppIdSet(err)) {
    return false;
  }

  String boxName = "u" + phoneDigits;
  String nameB64;
  if (!base64Encode(reinterpret_cast<const uint8_t *>(boxName.c_str()), boxName.length(), nameB64)) {
    err = "box encode failed";
    return false;
  }

  path = "/v2/applications/" + u64ToString(currentAppId) + "/box?name=" + urlEncode(nameB64);
  return true;
}

bool decodeArc4StringAt(const uint8_t *buf, size_t len, uint16_t offset, String &out) {
  if (offset + 2 > len) {
    return false;
  }

  uint16_t sLen = (static_cast<uint16_t>(buf[offset]) << 8) | static_cast<uint16_t>(buf[offset + 1]);
  size_t start = offset + 2;
  size_t end = start + sLen;
  if (end > len) {
    return false;
  }

  out = "";
  out.reserve(sLen);
  for (size_t i = start; i < end; i++) {
    out += static_cast<char>(buf[i]);
  }
  return true;
}

uint64_t readBE64(const uint8_t *p) {
  uint64_t v = 0;
  for (int i = 0; i < 8; i++) {
    v = (v << 8) | static_cast<uint64_t>(p[i]);
  }
  return v;
}

bool decodeUserData(const uint8_t *buf, size_t len, String &address, uint64_t &createdAt) {
  if (len < 12) {
    return false;
  }

  uint16_t addrOff = (static_cast<uint16_t>(buf[0]) << 8) | static_cast<uint16_t>(buf[1]);
  uint16_t encOff = (static_cast<uint16_t>(buf[2]) << 8) | static_cast<uint16_t>(buf[3]);
  createdAt = readBE64(buf + 4);

  if (!decodeArc4StringAt(buf, len, addrOff, address)) {
    return false;
  }

  String ignoreEncrypted;
  if (!decodeArc4StringAt(buf, len, encOff, ignoreEncrypted)) {
    return false;
  }

  return true;
}

bool boxExists(const String &phoneDigits, bool &exists, String &err) {
  String path;
  if (!makeUserBoxPath(phoneDigits, path, err)) {
    return false;
  }

  int statusCode = 0;
  String body;
  bool ok = algodGet(path, statusCode, body);
  if (ok) {
    exists = true;
    return true;
  }

  if (statusCode == 404) {
    exists = false;
    return true;
  }

  err = "EXISTS failed: HTTP " + String(statusCode);
  return false;
}

bool getUserAddressByPhone(const String &phoneDigits, String &address, uint64_t &createdAt, String &err) {
  String path;
  if (!makeUserBoxPath(phoneDigits, path, err)) {
    return false;
  }

  int statusCode = 0;
  String body;
  if (!algodGet(path, statusCode, body)) {
    err = (statusCode == 404) ? "USER not found" : ("USER failed: HTTP " + String(statusCode));
    return false;
  }

  StaticJsonDocument<4096> doc;
  DeserializationError parseErr = deserializeJson(doc, body);
  if (parseErr) {
    err = "USER parse error";
    return false;
  }

  const char *valueB64 = doc["value"] | "";
  if (strlen(valueB64) == 0) {
    err = "USER empty box value";
    return false;
  }

  uint8_t *raw = nullptr;
  size_t rawLen = 0;
  if (!base64Decode(String(valueB64), raw, rawLen)) {
    err = "USER base64 decode failed";
    return false;
  }

  bool ok = decodeUserData(raw, rawLen, address, createdAt);
  free(raw);
  if (!ok) {
    err = "USER decode failed";
    return false;
  }

  return true;
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
    return "Commands: APPID <id> | STATUS | TOTAL | EXISTS <phone> | ADDR <phone> | USER <phone>";
  }

  if (upper == "STATUS") {
    return getStatusSummary();
  }

  if (upper == "APPID") {
    if (currentAppId == 0) {
      return "APPID not set";
    }
    return "APPID " + u64ToString(currentAppId);
  }

  if (upper.startsWith("APPID ")) {
    String idStr = msg.substring(6);
    idStr.trim();
    uint64_t id = strtoull(idStr.c_str(), nullptr, 10);
    if (id == 0) {
      return "Invalid APPID";
    }
    currentAppId = id;
    return "APPID set to " + u64ToString(currentAppId);
  }

  if (upper == "TOTAL") {
    uint64_t totalUsers = 0;
    String err;
    if (!getTotalUsers(totalUsers, err)) {
      return err;
    }
    return "totalUsers=" + u64ToString(totalUsers);
  }

  if (upper.startsWith("EXISTS ")) {
    String phone = normalizePhone(msg.substring(7));
    if (phone.length() == 0) {
      return "EXISTS failed: invalid phone";
    }

    bool exists = false;
    String err;
    if (!boxExists(phone, exists, err)) {
      return err;
    }
    return exists ? "exists=true" : "exists=false";
  }

  if (upper.startsWith("ADDR ")) {
    String phone = normalizePhone(msg.substring(5));
    if (phone.length() == 0) {
      return "ADDR failed: invalid phone";
    }

    String addr;
    uint64_t createdAt = 0;
    String err;
    if (!getUserAddressByPhone(phone, addr, createdAt, err)) {
      return err;
    }
    return "addr=" + addr;
  }

  if (upper.startsWith("USER ")) {
    String phone = normalizePhone(msg.substring(5));
    if (phone.length() == 0) {
      return "USER failed: invalid phone";
    }

    String addr;
    uint64_t createdAt = 0;
    String err;
    if (!getUserAddressByPhone(phone, addr, createdAt, err)) {
      return err;
    }

    return "addr=" + addr + " createdAt=" + u64ToString(createdAt);
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
  SerialMon.println("PIGEON ESP32 + SIM800 contract interactor (TestNet, read-only)");

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

  SerialMon.println("[READY] No admin keys on device");
  SerialMon.println("[READY] SMS: APPID <id> then TOTAL/EXISTS/ADDR/USER");
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
