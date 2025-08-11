#include <WiFi.h>
#include <esp_wifi.h>
#include <WebServer.h>

#define AP_SSID "ESP32-Deauther"
#define AP_PASS "esp32wroom32"
#define LED 2
#define SERIAL_DEBUG
#define CHANNEL_MAX 13
#define NUM_FRAMES_PER_DEAUTH 16
#define DEAUTH_BLINK_TIMES 2
#define DEAUTH_BLINK_DURATION 20
#define DEAUTH_TYPE_SINGLE 0
#define DEAUTH_TYPE_ALL 1

int deauth_type = 0;
int eliminated_stations = 0;

#ifdef SERIAL_DEBUG
#define DEBUG_PRINT(...) Serial.print(VA_ARGS)
#define DEBUG_PRINTLN(...) Serial.println(VA_ARGS)
#define DEBUG_PRINTF(...) Serial.printf(VA_ARGS)
#else
#define DEBUG_PRINT(...)
#define DEBUG_PRINTLN(...)
#define DEBUG_PRINTF(...)
#endif

void blink_led(int num_times, int blink_duration) {
#ifdef LED
  for (int i = 0; i < num_times; i++) {
    digitalWrite(LED, HIGH);
    delay(blink_duration);
    digitalWrite(LED, LOW);
    delay(blink_duration);
  }
#endif
}

void send_deauth_frame(uint8_t *bssid, uint8_t reason) {
  blink_led(DEAUTH_BLINK_TIMES, DEAUTH_BLINK_DURATION);
  eliminated_stations++;
}

WebServer server(80);
int num_networks = 0;

void handle_root() {
  String html = "<html><body>";
  html += "<h1>ESP32-Deauther</h1>";
  html += "<h2>WiFi Networks:</h2>";
  html += "<table border='1'><tr><th>Number</th><th>SSID</th><th>BSSID</th><th>Channel</th><th>RSSI</th></tr>";
  for (int i = 0; i < num_networks; i++) {
    html += "<tr><td>" + String(i) + "</td><td>" + WiFi.SSID(i) + "</td><td>" + WiFi.BSSIDstr(i) + "</td><td>" + 
            String(WiFi.channel(i)) + "</td><td>" + String(WiFi.RSSI(i)) + "</td></tr>";
  }
  html += "</table>";
  html += "<form method='post' action='/rescan'><input type='submit' value='Rescan networks'></form><hr>";
  html += "<form method='post' action='/deauth'>Network Number: <input type='text' name='net_num'><br>Reason code: <input type='text' name='reason'><br><input type='submit' value='Launch Deauth-Attack'></form>";
  html += "Eliminated stations: " + String(eliminated_stations) + "<br><hr>";
  html += "<form method='post' action='/deauth_all'>Reason code: <input type='text' name='reason'><br><input type='submit' value='Deauth all Networks'></form><hr>";
  html += "<form method='post' action='/stop'><input type='submit' value='Stop Deauth-Attack'></form>";
  html += "<table border='1'><tr><th>Reason code</th><th>Meaning</th></tr>";
  html += "<tr><td>1</td><td>Unspecified reason.</td></tr>";
  html += "<tr><td>2</td><td>Previous authentication no longer valid.</td></tr>";
  html += "<tr><td>3</td><td>Leaving IBSS or ESS.</td></tr>";
  html += "<tr><td>4</td><td>Disassociated due to inactivity.</td></tr>";
  html += "<tr><td>5</td><td>WAP can't handle all STAs.</td></tr>";
  html += "</table>";
  html += "</body></html>";
  server.send(200, "text/html", html);
}

void handle_rescan() {
  num_networks = WiFi.scanNetworks();
  server.sendHeader("Location", "/");
  server.send(303);
}

void handle_deauth() {
  if (!server.hasArg("net_num")  !server.hasArg("reason")) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }
  int net_num = server.arg("net_num").toInt();
  int reason = server.arg("reason").toInt();
  if (net_num < 0  net_num >= num_networks) {
    server.send(400, "text/plain", "Invalid network number");
    return;
  }

  uint8_t bssid[6];
  WiFi.BSSID(net_num, bssid);
  send_deauth_frame(bssid, reason);
  server.sendHeader("Location", "/");
  server.send(303);
}

void handle_deauth_all() {
  if (!server.hasArg("reason")) {
    server.send(400, "text/plain", "Bad Request");
    return;
  }
  int reason = server.arg("reason").toInt();
  deauth_type = DEAUTH_TYPE_ALL;
  server.sendHeader("Location", "/");
  server.send(303);
}

void handle_stop() {
  deauth_type = DEAUTH_TYPE_SINGLE;
  server.sendHeader("Location", "/");
  server.send(303);
}

void start_net_interface() {
  WiFi.scanNetworks(true); 
  num_networks = WiFi.scanNetworks();
  server.on("/", HTTP_GET, handle_root);
  server.on("/rescan", HTTP_POST, handle_rescan);
  server.on("/deauth", HTTP_POST, handle_deauth);
  server.on("/deauth_all", HTTP_POST, handle_deauth_all);
  server.on("/stop", HTTP_POST, handle_stop);
  server.begin();
}

void net_interface_handle_client() {
  server.handleClient();
}

int curr_channel = 1;

void setup() {
#ifdef SERIAL_DEBUG
  Serial.begin(115200);
#endif
#ifdef LED
  pinMode(LED, OUTPUT);
#endif

  WiFi.mode(WIFI_MODE_AP);
  WiFi.softAP(AP_SSID, AP_PASS);

  start_net_interface();
}

void loop() {
  if (deauth_type == DEAUTH_TYPE_ALL) {
    if (curr_channel > CHANNEL_MAX) curr_channel = 1;
    esp_wifi_set_channel(curr_channel, WIFI_SECOND_CHAN_NONE);
    curr_channel++;
    delay(10);
  } else {
    net_interface_handle_client();
  }
}