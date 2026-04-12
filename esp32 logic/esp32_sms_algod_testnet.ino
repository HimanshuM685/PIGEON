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

const char INDEXER_HOST[] = "testnet-idx.4160.nodely.dev";
const int INDEXER_PORT = 443;

const uint64_t CONTRACT_APP_ID = 0;

const int SIM800_RX = 16;
const int SIM800_TX = 17;

const uint32_t HTTP_TIMEOUT_MS = 30000;
const int MAX_REPLY_SMS_LEN = 155;
const unsigned long SMS_PARSE_DELAY_MS = 500;

const int MAX_PENDING_SEND = 5;
const unsigned long SEND_CONFIRM_TTL_MS = 120000;

TinyGsm modem(SerialAT);

String serialBuffer = "";
unsigned long lastDataTime = 0;

struct PendingSend {
  bool active;
  String phone;
  String fromAddr;
  String toAddr;
  uint64_t amountMicro;
  unsigned long expiresAt;
};

PendingSend pendingSends[MAX_PENDING_SEND];

String u64ToString(uint64_t value) {
  char buf[32];
  snprintf(buf, sizeof(buf), "%llu", static_cast<unsigned long long>(value));
  return String(buf);
}

String microAlgoToAlgoString(uint64_t micro) {
  uint64_t whole = micro / 1000000ULL;
  uint64_t frac = micro % 1000000ULL;
  char fracBuf[8];
  snprintf(fracBuf, sizeof(fracBuf), "%06llu", static_cast<unsigned long long>(frac));
  return u64ToString(whole) + "." + String(fracBuf);
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

bool looksLikeAlgoAddress(const String &raw) {
  String s = raw;
  s.trim();
  s.toUpperCase();
  if (s.length() != 58) {
    return false;
  }

  for (size_t i = 0; i < s.length(); i++) {
    char c = s[i];
    bool az = (c >= 'A' && c <= 'Z');
    bool b32 = (c >= '2' && c <= '7');
    if (!(az || b32)) {
      return false;
    }
  }
  return true;
}

bool parseAlgoAmountToMicro(const String &token, uint64_t &amountMicro) {
  String t = token;
  t.trim();
  t.toUpperCase();
  t.replace("ALGO", "");
  t.replace(" ", "");

  if (t.length() == 0) {
    return false;
  }

  bool dotSeen = false;
  String filtered = "";
  for (size_t i = 0; i < t.length(); i++) {
    char c = t[i];
    if (c >= '0' && c <= '9') {
      filtered += c;
    } else if (c == '.' && !dotSeen) {
      filtered += c;
      dotSeen = true;
    } else {
      return false;
    }
  }

  int dot = filtered.indexOf('.');
  String wholePart = (dot >= 0) ? filtered.substring(0, dot) : filtered;
  String fracPart = (dot >= 0) ? filtered.substring(dot + 1) : "";

  if (wholePart.length() == 0) {
    wholePart = "0";
  }
  if (fracPart.length() > 6) {
    return false;
  }

  while (fracPart.length() < 6) {
    fracPart += "0";
  }

  uint64_t whole = strtoull(wholePart.c_str(), nullptr, 10);
  uint64_t frac = (fracPart.length() > 0) ? strtoull(fracPart.c_str(), nullptr, 10) : 0;

  if (whole > 18446744073709ULL) {
    return false;
  }

  amountMicro = whole * 1000000ULL + frac;
  return amountMicro > 0;
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

bool httpsGetHost(const char *host, int port, const String &path, int &statusCode, String &responseBody) {
  WiFiClientSecure client;
  client.setInsecure();

  HttpClient http(client, host, port);
  http.setTimeout(HTTP_TIMEOUT_MS);
  http.connectionKeepAlive();

  http.get(path);
  statusCode = http.responseStatusCode();
  responseBody = http.responseBody();

  SerialMon.print("[HTTP] GET https://");
  SerialMon.print(host);
  SerialMon.print(path);
  SerialMon.print(" -> ");
  SerialMon.println(statusCode);

  return statusCode >= 200 && statusCode < 300;
}

bool algodGet(const String &path, int &statusCode, String &responseBody) {
  return httpsGetHost(ALGOD_HOST, ALGOD_PORT, path, statusCode, responseBody);
}

bool indexerGet(const String &path, int &statusCode, String &responseBody) {
  return httpsGetHost(INDEXER_HOST, INDEXER_PORT, path, statusCode, responseBody);
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

  SerialMon.print("[HTTP] POST https://");
  SerialMon.print(ALGOD_HOST);
  SerialMon.print(path);
  SerialMon.print(" -> ");
  SerialMon.println(statusCode);

  return statusCode >= 200 && statusCode < 300;
}

uint64_t readBE64(const uint8_t *p) {
  uint64_t v = 0;
  for (int i = 0; i < 8; i++) {
    v = (v << 8) | static_cast<uint64_t>(p[i]);
  }
  return v;
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

bool decodeUserData(const uint8_t *buf, size_t len, String &address, String &encryptedMnemonic, uint64_t &createdAt) {
  if (len < 12) {
    return false;
  }

  uint16_t addrOff = (static_cast<uint16_t>(buf[0]) << 8) | static_cast<uint16_t>(buf[1]);
  uint16_t encOff = (static_cast<uint16_t>(buf[2]) << 8) | static_cast<uint16_t>(buf[3]);
  createdAt = readBE64(buf + 4);

  if (!decodeArc4StringAt(buf, len, addrOff, address)) {
    return false;
  }
  if (!decodeArc4StringAt(buf, len, encOff, encryptedMnemonic)) {
    return false;
  }

  return true;
}

bool makeUserBoxPath(const String &phoneDigits, String &path, String &err) {
  if (CONTRACT_APP_ID == 0) {
    err = "Set CONTRACT_APP_ID in firmware";
    return false;
  }

  String boxName = "u" + phoneDigits;
  String nameB64;
  if (!base64Encode(reinterpret_cast<const uint8_t *>(boxName.c_str()), boxName.length(), nameB64)) {
    err = "box encode failed";
    return false;
  }

  path = "/v2/applications/" + u64ToString(CONTRACT_APP_ID) + "/box?name=" + urlEncode(nameB64);
  return true;
}

bool getUserFromPhone(const String &phoneDigits, String &address, String &encryptedMnemonic, uint64_t &createdAt, String &err) {
  String path;
  if (!makeUserBoxPath(phoneDigits, path, err)) {
    return false;
  }

  int statusCode = 0;
  String body;
  if (!algodGet(path, statusCode, body)) {
    err = (statusCode == 404) ? "User not found" : ("User lookup failed HTTP " + String(statusCode));
    return false;
  }

  StaticJsonDocument<4096> doc;
  DeserializationError parseErr = deserializeJson(doc, body);
  if (parseErr) {
    err = "User lookup parse error";
    return false;
  }

  const char *valueB64 = doc["value"] | "";
  if (strlen(valueB64) == 0) {
    err = "User box empty";
    return false;
  }

  uint8_t *raw = nullptr;
  size_t rawLen = 0;
  if (!base64Decode(String(valueB64), raw, rawLen)) {
    err = "User decode base64 failed";
    return false;
  }

  bool ok = decodeUserData(raw, rawLen, address, encryptedMnemonic, createdAt);
  free(raw);
  if (!ok) {
    err = "User ARC4 decode failed";
    return false;
  }

  return true;
}

bool resolveSenderAddress(const String &senderPhoneRaw, String &senderAddr, String &encryptedMnemonic, uint64_t &createdAt, String &err) {
  String normalized = normalizePhone(senderPhoneRaw);
  if (normalized.length() == 0) {
    err = "Cannot parse sender phone";
    return false;
  }
  return getUserFromPhone(normalized, senderAddr, encryptedMnemonic, createdAt, err);
}

bool resolveRecipientAddress(const String &recipientRaw, String &recipientAddr, String &err) {
  String candidate = recipientRaw;
  candidate.trim();
  while (candidate.endsWith(".") || candidate.endsWith(",")) {
    candidate.remove(candidate.length() - 1);
  }

  if (looksLikeAlgoAddress(candidate)) {
    candidate.toUpperCase();
    recipientAddr = candidate;
    return true;
  }

  String phone = normalizePhone(candidate);
  if (phone.length() == 0) {
    err = "Recipient must be phone or Algorand address";
    return false;
  }

  String encryptedMnemonic;
  uint64_t createdAt = 0;
  if (!getUserFromPhone(phone, recipientAddr, encryptedMnemonic, createdAt, err)) {
    err = "Recipient not onboarded";
    return false;
  }

  return true;
}

String getStatusSummary() {
  int statusCode = 0;
  String body;
  if (!algodGet("/v2/status", statusCode, body)) {
    return "STATUS failed HTTP " + String(statusCode);
  }

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    return "STATUS parse error";
  }

  uint64_t lastRound = doc["last-round"] | 0;
  return "TESTNET OK round=" + u64ToString(lastRound);
}

String getBalanceForSender(const String &senderPhoneRaw) {
  String senderAddr;
  String encryptedMnemonic;
  uint64_t createdAt = 0;
  String err;
  if (!resolveSenderAddress(senderPhoneRaw, senderAddr, encryptedMnemonic, createdAt, err)) {
    return "BAL failed: " + err;
  }

  int statusCode = 0;
  String body;
  String path = "/v2/accounts/" + senderAddr;
  if (!algodGet(path, statusCode, body)) {
    return "BAL failed HTTP " + String(statusCode);
  }

  StaticJsonDocument<4096> doc;
  DeserializationError parseErr = deserializeJson(doc, body);
  if (parseErr) {
    return "BAL parse error";
  }

  uint64_t amount = doc["amount"] | 0;
  uint64_t minBal = doc["min-balance"] | 0;
  String spendable = (amount > minBal) ? microAlgoToAlgoString(amount - minBal) : "0.000000";

  return "addr=" + senderAddr + " bal=" + microAlgoToAlgoString(amount) + " ALGO spendable=" + spendable;
}

String shortId(const String &id) {
  if (id.length() <= 10) {
    return id;
  }
  return id.substring(0, 10);
}

String getTransactionsForSender(const String &senderPhoneRaw) {
  String senderAddr;
  String encryptedMnemonic;
  uint64_t createdAt = 0;
  String err;
  if (!resolveSenderAddress(senderPhoneRaw, senderAddr, encryptedMnemonic, createdAt, err)) {
    return "TX failed: " + err;
  }

  String path = "/v2/accounts/" + senderAddr + "/transactions?limit=3";
  int statusCode = 0;
  String body;
  if (!indexerGet(path, statusCode, body)) {
    return "TX failed HTTP " + String(statusCode);
  }

  StaticJsonDocument<16384> doc;
  DeserializationError parseErr = deserializeJson(doc, body);
  if (parseErr) {
    return "TX parse error";
  }

  JsonArray txs = doc["transactions"].as<JsonArray>();
  if (txs.isNull() || txs.size() == 0) {
    return "No recent transactions";
  }

  String reply = "Recent TX:\n";
  int i = 0;
  for (JsonObject tx : txs) {
    if (i >= 3) {
      break;
    }

    String id = String(tx["id"] | "");
    String type = String(tx["tx-type"] | "?");
    uint64_t round = tx["confirmed-round"] | 0;

    if (type == "pay") {
      String sender = String(tx["sender"] | "");
      JsonObject pay = tx["payment-transaction"].as<JsonObject>();
      uint64_t amount = pay["amount"] | 0;
      String receiver = String(pay["receiver"] | "");
      bool outgoing = sender.equalsIgnoreCase(senderAddr);
      reply += String(i + 1) + ") " + (outgoing ? "OUT " : "IN ") + microAlgoToAlgoString(amount) + " id=" + shortId(id) + " r=" + u64ToString(round) + "\n";
    } else {
      reply += String(i + 1) + ") " + type + " id=" + shortId(id) + " r=" + u64ToString(round) + "\n";
    }

    i++;
  }

  reply.trim();
  return reply;
}

String fundForSender(const String &senderPhoneRaw) {
  String senderAddr;
  String encryptedMnemonic;
  uint64_t createdAt = 0;
  String err;
  if (!resolveSenderAddress(senderPhoneRaw, senderAddr, encryptedMnemonic, createdAt, err)) {
    return "FUND failed: " + err;
  }

  String url = "https://bank.testnet.algorand.network/?account=" + senderAddr;
  return "Open faucet: " + url;
}

String createForSender(const String &senderPhoneRaw) {
  String senderAddr;
  String encryptedMnemonic;
  uint64_t createdAt = 0;
  String err;
  if (resolveSenderAddress(senderPhoneRaw, senderAddr, encryptedMnemonic, createdAt, err)) {
    return "Wallet already exists: " + senderAddr;
  }

  String normalized = normalizePhone(senderPhoneRaw);
  if (normalized.length() == 0) {
    return "CREATE failed: invalid sender phone";
  }

  return "CREATE requested for " + normalized + ". Wallet creation/onboarding signer is not configured on this firmware.";
}

void clearExpiredPendingSends() {
  unsigned long now = millis();
  for (int i = 0; i < MAX_PENDING_SEND; i++) {
    if (pendingSends[i].active) {
      long remaining = static_cast<long>(pendingSends[i].expiresAt - now);
      if (remaining <= 0) {
        pendingSends[i].active = false;
      }
    }
  }
}

PendingSend *findPendingSend(const String &phoneDigits) {
  for (int i = 0; i < MAX_PENDING_SEND; i++) {
    if (pendingSends[i].active && pendingSends[i].phone == phoneDigits) {
      return &pendingSends[i];
    }
  }
  return nullptr;
}

PendingSend *allocPendingSend(const String &phoneDigits) {
  PendingSend *existing = findPendingSend(phoneDigits);
  if (existing) {
    return existing;
  }

  for (int i = 0; i < MAX_PENDING_SEND; i++) {
    if (!pendingSends[i].active) {
      return &pendingSends[i];
    }
  }

  return &pendingSends[0];
}

bool performSignedSendWithPassword(const PendingSend &pending, const String &password, String &txId, String &err) {
  (void)pending;
  (void)password;
  txId = "";
  err = "Signing not enabled. Use SENDTX <base64_signed_txn> if you sign off-device.";
  return false;
}

String submitSignedTransaction(const String &signedTxnB64) {
  uint8_t *txBytes = nullptr;
  size_t txLen = 0;
  if (!base64Decode(signedTxnB64, txBytes, txLen)) {
    return "SENDTX failed: invalid base64";
  }

  int statusCode = 0;
  String responseBody;
  bool ok = algodPostBinary("/v2/transactions", txBytes, txLen, statusCode, responseBody);
  free(txBytes);

  if (!ok) {
    return "SENDTX failed HTTP " + String(statusCode);
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
    return "PENDING failed HTTP " + String(statusCode);
  }

  StaticJsonDocument<2048> doc;
  DeserializationError err = deserializeJson(doc, body);
  if (err) {
    return "PENDING parse error";
  }

  uint64_t confirmedRound = doc["confirmed-round"] | 0;
  const char *poolError = doc["pool-error"] | "";
  if (confirmedRound > 0) {
    return "CONFIRMED round=" + u64ToString(confirmedRound);
  }
  if (strlen(poolError) > 0) {
    return "PENDING error: " + String(poolError);
  }
  return "PENDING: not confirmed yet";
}

String prepareSendIntent(const String &messageBody, const String &senderPhoneRaw) {
  String msg = messageBody;
  msg.trim();

  String upper = msg;
  upper.toUpperCase();

  int toPos = upper.indexOf(" TO ");
  if (toPos < 0) {
    return "SEND format: Send <amount> Algo to <phone|address>";
  }

  String amountToken = msg.substring(5, toPos);
  amountToken.trim();

  uint64_t amountMicro = 0;
  if (!parseAlgoAmountToMicro(amountToken, amountMicro)) {
    return "Invalid amount. Example: Send 10 Algo to +919123456789";
  }

  String recipientRaw = msg.substring(toPos + 4);
  recipientRaw.trim();

  String senderAddr;
  String encryptedMnemonic;
  uint64_t createdAt = 0;
  String err;
  if (!resolveSenderAddress(senderPhoneRaw, senderAddr, encryptedMnemonic, createdAt, err)) {
    return "SEND failed: " + err;
  }

  String recipientAddr;
  if (!resolveRecipientAddress(recipientRaw, recipientAddr, err)) {
    return "SEND failed: " + err;
  }

  String senderPhone = normalizePhone(senderPhoneRaw);
  PendingSend *slot = allocPendingSend(senderPhone);
  slot->active = true;
  slot->phone = senderPhone;
  slot->fromAddr = senderAddr;
  slot->toAddr = recipientAddr;
  slot->amountMicro = amountMicro;
  slot->expiresAt = millis() + SEND_CONFIRM_TTL_MS;

  return "Prepared: " + microAlgoToAlgoString(amountMicro) + " ALGO to " + recipientAddr + ". Reply PASS <password> in 120s.";
}

String confirmSendIntent(const String &passwordRaw, const String &senderPhoneRaw) {
  String phone = normalizePhone(senderPhoneRaw);
  PendingSend *pending = findPendingSend(phone);
  if (!pending) {
    return "No pending SEND. Use: Send <amount> Algo to <recipient>";
  }

  if (static_cast<long>(pending->expiresAt - millis()) <= 0) {
    pending->active = false;
    return "Pending SEND expired. Create again.";
  }

  String password = passwordRaw;
  password.trim();
  if (password.length() == 0) {
    return "PASS format: PASS <password>";
  }

  String txId;
  String err;
  bool ok = performSignedSendWithPassword(*pending, password, txId, err);
  if (!ok) {
    return "SEND confirm failed: " + err;
  }

  pending->active = false;
  return "SEND submitted txId=" + txId;
}

bool isBalanceIntent(const String &upper) {
  return upper == "BAL" || upper == "BALANCE" || upper == "GET BAL" || upper == "GET BALANCE" || upper == "GET BALENCE";
}

bool isTransactionsIntent(const String &upper) {
  return upper == "GET TNX" || upper == "GET TXNS" || upper == "GET TRANSACTIONS" || upper == "TNX" || upper == "TXNS";
}

String processCommand(const String &messageBody, const String &senderPhoneRaw) {
  clearExpiredPendingSends();

  String msg = messageBody;
  msg.trim();
  if (msg.length() == 0) {
    return "Empty command";
  }

  String upper = msg;
  upper.toUpperCase();

  if (upper == "HELP") {
    return "Use: CREATE | SEND <amt> ALGO TO <phone|addr> | PASS <pwd> | BAL | FUND | GET TNX";
  }

  if (upper == "STATUS") {
    return getStatusSummary();
  }

  if (upper == "CREATE" || upper == "CREATE WALLET") {
    return createForSender(senderPhoneRaw);
  }

  if (isBalanceIntent(upper)) {
    return getBalanceForSender(senderPhoneRaw);
  }

  if (isTransactionsIntent(upper)) {
    return getTransactionsForSender(senderPhoneRaw);
  }

  if (upper == "FUND" || upper == "FAUCET") {
    return fundForSender(senderPhoneRaw);
  }

  if (upper.startsWith("SEND ")) {
    return prepareSendIntent(msg, senderPhoneRaw);
  }

  if (upper.startsWith("PASS ")) {
    return confirmSendIntent(msg.substring(5), senderPhoneRaw);
  }

  if (upper.startsWith("SENDTX ")) {
    return submitSignedTransaction(msg.substring(7));
  }

  if (upper.startsWith("PENDING ")) {
    String txId = msg.substring(8);
    txId.trim();
    return getPendingSummary(txId);
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

  String reply = processCommand(messageBody, senderPhone);
  sendLongSMS(senderPhone, reply);
}

void setup() {
  SerialMon.begin(115200);
  delay(100);

  SerialMon.println();
  SerialMon.println("PIGEON ESP32 + SIM800 SMS Agent (TestNet)");
  SerialMon.println("Intents: CREATE, SEND, BAL, FUND, GET TNX");

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

  if (CONTRACT_APP_ID == 0) {
    SerialMon.println("[WARN] CONTRACT_APP_ID is 0. Set deployed app id in firmware.");
  }

  SerialMon.println("[READY] Waiting for SMS intents...");
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

  clearExpiredPendingSends();

  if (WiFi.status() != WL_CONNECTED) {
    SerialMon.println("[WARN] WiFi lost, reconnecting");
    connectWiFi();
  }

  delay(10);
}
