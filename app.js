/*
============================================================
 AUTHEO EMBEDDED LAB
 Virtual MCU Testing / Observation Environment
 app.js
============================================================

 Current capabilities:

   - MCU selection
   - Arduino sketch editor
   - Run / Stop / Reset
   - Simulated Serial Monitor
   - Simulated OLED display
   - GPIO state visualization
   - WiFi state
   - Virtual clock
   - Runtime statistics
   - Basic Arduino sketch interpretation
   - Recognizes common Arduino APIs
   - Extensible architecture for future WASM compiler

 Future backend:

   Arduino C++ source
          |
          v
   Arduino CLI / WASM
          |
          v
      Real binary
          |
          v
   Hardware abstraction layer
          |
          +---- Serial
          +---- GPIO
          +---- OLED
          +---- WiFi
          +---- SPI
          +---- I2C
          +---- ADC

============================================================
*/


// ============================================================
// GLOBAL APPLICATION STATE
// ============================================================

const App = {

    running: false,

    startTime: 0,

    elapsed: 0,

    selectedMCU: "ESP32",

    sketch: "",

    interval: null,

    tickRate: 100,

    serialLines: [],

    events: [],

    gpio: {},

    oled: {

        width: 128,

        height: 64,

        lines: []

    },

    wifi: {

        connected: false,

        ssid: "",

        ip: "0.0.0.0",

        rssi: -127

    },

    stats: {

        loops: 0,

        serialMessages: 0,

        gpioEvents: 0,

        oledUpdates: 0,

        wifiEvents: 0,

        errors: 0

    }

};


// ============================================================
// MCU DEFINITIONS
// ============================================================

const MCU_DATABASE = {

    ESP32: {

        name: "ESP32",

        architecture: "Xtensa / RISC-V",

        cpu: "240 MHz",

        flash: "4 MB",

        ram: "520 KB",

        voltage: "3.3V",

        analogPins: 18,

        digitalPins: 34,

        wifi: true,

        bluetooth: true,

        i2c: true,

        spi: true,

        uart: true

    },


    ESP32_S3: {

        name: "ESP32-S3",

        architecture: "Xtensa LX7",

        cpu: "240 MHz",

        flash: "4 MB",

        ram: "512 KB",

        voltage: "3.3V",

        analogPins: 20,

        digitalPins: 45,

        wifi: true,

        bluetooth: true,

        i2c: true,

        spi: true,

        uart: true

    },


    ESP8266: {

        name: "ESP8266",

        architecture: "Xtensa",

        cpu: "80/160 MHz",

        flash: "4 MB",

        ram: "160 KB",

        voltage: "3.3V",

        analogPins: 1,

        digitalPins: 17,

        wifi: true,

        bluetooth: false,

        i2c: true,

        spi: true,

        uart: true

    },


    ARDUINO_UNO: {

        name: "Arduino Uno",

        architecture: "AVR",

        cpu: "16 MHz",

        flash: "32 KB",

        ram: "2 KB",

        voltage: "5V",

        analogPins: 6,

        digitalPins: 14,

        wifi: false,

        bluetooth: false,

        i2c: true,

        spi: true,

        uart: true

    },


    ARDUINO_NANO: {

        name: "Arduino Nano",

        architecture: "AVR",

        cpu: "16 MHz",

        flash: "32 KB",

        ram: "2 KB",

        voltage: "5V",

        analogPins: 8,

        digitalPins: 22,

        wifi: false,

        bluetooth: false,

        i2c: true,

        spi: true,

        uart: true

    }

};


// ============================================================
// DOM REFERENCES
// ============================================================

const UI = {

    editor: null,

    mcuSelect: null,

    runButton: null,

    stopButton: null,

    resetButton: null,

    serial: null,

    oled: null,

    gpio: null,

    status: null,

    runtime: null,

    stats: null,

    wifi: null

};


// ============================================================
// INITIALIZATION
// ============================================================

function initApp() {

    UI.editor =
        document.querySelector("#sketchEditor");

    UI.mcuSelect =
        document.querySelector("#mcuSelect");

    UI.runButton =
        document.querySelector("#runButton");

    UI.stopButton =
        document.querySelector("#stopButton");

    UI.resetButton =
        document.querySelector("#resetButton");

    UI.serial =
        document.querySelector("#serialOutput");

    UI.oled =
        document.querySelector("#oledDisplay");

    UI.gpio =
        document.querySelector("#gpioPanel");

    UI.status =
        document.querySelector("#runtimeStatus");

    UI.runtime =
        document.querySelector("#runtime");

    UI.stats =
        document.querySelector("#stats");

    UI.wifi =
        document.querySelector("#wifiStatus");


    populateMCUs();

    attachEvents();

    resetSimulation();

    renderAll();

}


// ============================================================
// MCU SELECTOR
// ============================================================

function populateMCUs() {

    if (!UI.mcuSelect)
        return;


    UI.mcuSelect.innerHTML = "";


    Object.entries(MCU_DATABASE)
        .forEach(([id, mcu]) => {

            const option =
                document.createElement("option");

            option.value = id;

            option.textContent =
                mcu.name;

            UI.mcuSelect.appendChild(
                option
            );

        });


    UI.mcuSelect.value =
        App.selectedMCU;

}


// ============================================================
// EVENTS
// ============================================================

function attachEvents() {

    if (UI.runButton) {

        UI.runButton.addEventListener(
            "click",
            runSketch
        );

    }


    if (UI.stopButton) {

        UI.stopButton.addEventListener(
            "click",
            stopSketch
        );

    }


    if (UI.resetButton) {

        UI.resetButton.addEventListener(
            "click",
            resetSimulation
        );

    }


    if (UI.mcuSelect) {

        UI.mcuSelect.addEventListener(
            "change",
            () => {

                App.selectedMCU =
                    UI.mcuSelect.value;

                resetSimulation();

                renderMCUInfo();

            }
        );

    }

}


// ============================================================
// RUN
// ============================================================

function runSketch() {

    if (App.running)
        return;


    if (!UI.editor) {

        console.error(
            "Sketch editor not found."
        );

        return;

    }


    App.sketch =
        UI.editor.value;


    if (!App.sketch.trim()) {

        addSerial(
            "[LAB] No sketch supplied."
        );

        return;

    }


    App.running = true;

    App.startTime =
        performance.now();

    App.elapsed = 0;


    setStatus(
        "RUNNING"
    );


    addSerial(
        "[LAB] Starting virtual MCU..."
    );


    addSerial(
        `[LAB] Target: ${App.selectedMCU}`
    );


    const mcu =
        MCU_DATABASE[
            App.selectedMCU
        ];


    addSerial(
        `[LAB] CPU: ${mcu.cpu}`
    );


    addSerial(
        "[LAB] Executing setup()..."
    );


    simulateSetup();


    App.interval =
        setInterval(
            simulationTick,
            App.tickRate
        );

}


// ============================================================
// STOP
// ============================================================

function stopSketch() {

    if (!App.running)
        return;


    App.running = false;


    if (App.interval) {

        clearInterval(
            App.interval
        );

        App.interval = null;

    }


    setStatus(
        "STOPPED"
    );


    addSerial(
        "[LAB] Simulation stopped."
    );

}


// ============================================================
// RESET
// ============================================================

function resetSimulation() {

    stopSketch();


    App.elapsed = 0;

    App.serialLines = [];

    App.events = [];

    App.gpio = {};

    App.oled.lines = [];


    App.wifi = {

        connected: false,

        ssid: "",

        ip: "0.0.0.0",

        rssi: -127

    };


    App.stats = {

        loops: 0,

        serialMessages: 0,

        gpioEvents: 0,

        oledUpdates: 0,

        wifiEvents: 0,

        errors: 0

    };


    setStatus(
        "READY"
    );


    addSerial(
        "[LAB] Virtual MCU reset."
    );


    renderAll();

}


// ============================================================
// SIMULATION TICK
// ============================================================

function simulationTick() {

    if (!App.running)
        return;


    App.elapsed =
        performance.now() -
        App.startTime;


    App.stats.loops++;


    simulateLoop();


    renderAll();

}


// ============================================================
// SETUP SIMULATOR
// ============================================================

function simulateSetup() {

    const code =
        App.sketch;


    // Serial.begin()

    const serialMatch =
        code.match(
            /Serial\.begin\s*\(\s*(\d+)\s*\)/
        );


    if (serialMatch) {

        addSerial(
            `[Serial] ${serialMatch[1]} baud`
        );

    }


    // pinMode()

    const pinRegex =
        /pinMode\s*\(\s*([A-Za-z0-9_]+)\s*,\s*(INPUT_PULLUP|INPUT|OUTPUT)\s*\)/g;


    let pinMatch;


    while (
        (pinMatch =
            pinRegex.exec(code))
    ) {

        setGPIO(
            pinMatch[1],
            "LOW",
            pinMatch[2]
        );

    }


    // WiFi.begin()

    if (
        code.includes(
            "WiFi.begin"
        )
    ) {

        simulateWiFi();

    }


    // Wire.begin()

    if (
        code.includes(
            "Wire.begin"
        )
    ) {

        addSerial(
            "[I2C] Bus initialized."
        );

    }


    // display.begin()

    if (
        code.includes(
            "display.begin"
        )
    ) {

        addSerial(
            "[OLED] SSD1306 initialized."
        );

    }


    // Initial OLED content

    simulateOLED();

}


// ============================================================
// LOOP SIMULATOR
// ============================================================

function simulateLoop() {

    const code =
        App.sketch;


    // --------------------------------------------------------
    // Serial.println
    // --------------------------------------------------------

    const printRegex =
        /Serial\.println\s*\(\s*(?:F\s*\(\s*)?["']([^"']*)["']\s*\)?\s*\)/g;


    let match;


    while (
        (match =
            printRegex.exec(code))
    ) {

        addSerial(
            `[Serial] ${match[1]}`
        );

    }


    // --------------------------------------------------------
    // digitalWrite
    // --------------------------------------------------------

    const digitalRegex =
        /digitalWrite\s*\(\s*([A-Za-z0-9_]+)\s*,\s*(HIGH|LOW)\s*\)/g;


    while (
        (match =
            digitalRegex.exec(code))
    ) {

        setGPIO(
            match[1],
            match[2]
        );

    }


    // --------------------------------------------------------
    // WiFi.status
    // --------------------------------------------------------

    if (
        code.includes(
            "WiFi.status"
        )
    ) {

        if (!App.wifi.connected) {

            simulateWiFi();

        }

    }


    // --------------------------------------------------------
    // WiFi.RSSI
    // --------------------------------------------------------

    if (
        code.includes(
            "WiFi.RSSI"
        )
    ) {

        App.wifi.rssi =
            simulateRSSI();

    }


    // --------------------------------------------------------
    // OLED
    // --------------------------------------------------------

    if (
        code.includes(
            "display.display"
        )
    ) {

        simulateOLED();

    }

}


// ============================================================
// SERIAL
// ============================================================

function addSerial(
    message
) {

    const timestamp =
        formatRuntime(
            App.elapsed
        );


    App.serialLines.push({

        timestamp,

        message

    });


    App.stats.serialMessages++;


    // Keep UI manageable

    if (
        App.serialLines.length >
        500
    ) {

        App.serialLines.shift();

    }


    renderSerial();

}


// ============================================================
// GPIO
// ============================================================

function setGPIO(
    pin,
    state,
    mode = null
) {

    if (!App.gpio[pin]) {

        App.gpio[pin] = {

            state: "LOW",

            mode: mode || "UNKNOWN",

            changes: 0

        };

    }


    if (
        App.gpio[pin].state !==
        state
    ) {

        App.gpio[pin].changes++;

        App.stats.gpioEvents++;

    }


    App.gpio[pin].state =
        state;


    if (mode) {

        App.gpio[pin].mode =
            mode;

    }


    addEvent(
        "GPIO",
        `${pin} -> ${state}`
    );

}


// ============================================================
// OLED SIMULATION
// ============================================================

function simulateOLED() {

    if (
        !UI.oled
    )
        return;


    const code =
        App.sketch;


    const lines = [];


    /*
      Basic parser for:

        display.println("Hello");

        display.print("IP: ");

      This is intentionally a first-generation
      simulation layer. A later version can
      execute a real Arduino binary against
      a virtual hardware HAL.
    */


    const regex =
      /display\.(?:println|print)\s*\(\s*(?:F\s*\(\s*)?["']([^"']*)["']\s*\)?\s*\)/g;


    let match;


    while (
        (match =
            regex.exec(code))
    ) {

        lines.push(
            match[1]
        );

    }


    if (
        lines.length
    ) {

        App.oled.lines =
            lines.slice(-6);

        App.stats.oledUpdates++;

    }


    renderOLED();

}


// ============================================================
// WIFI SIMULATION
// ============================================================

function simulateWiFi() {

    if (
        !MCU_DATABASE[
            App.selectedMCU
        ].wifi
    ) {

        addSerial(
            "[WiFi] ERROR: MCU has no Wi-Fi."
        );

        App.stats.errors++;

        return;

    }


    App.wifi.connected =
        true;


    App.wifi.ssid =
        extractWiFiSSID();


    App.wifi.ip =
        generateVirtualIP();


    App.wifi.rssi =
        simulateRSSI();


    App.stats.wifiEvents++;


    addSerial(
        `[WiFi] Connected to ${App.wifi.ssid}`
    );


    addSerial(
        `[WiFi] IP ${App.wifi.ip}`
    );


    addEvent(
        "NETWORK",
        `Connected: ${App.wifi.ip}`
    );


    renderWiFi();

}


// ============================================================
// WIFI HELPERS
// ============================================================

function extractWiFiSSID() {

    const match =
        App.sketch.match(
            /WiFi\.begin\s*\(\s*([^,\)]+)/
        );


    if (!match)
        return "VirtualWiFi";


    return cleanCppString(
        match[1]
    );

}


function generateVirtualIP() {

    return "192.168.1.42";

}


function simulateRSSI() {

    const variation =
        Math.sin(
            App.elapsed / 3000
        ) * 4;


    return Math.round(
        -52 + variation
    );

}


// ============================================================
// EVENTS
// ============================================================

function addEvent(
    type,
    message
) {

    App.events.push({

        time:
            formatRuntime(
                App.elapsed
            ),

        type,

        message

    });


    if (
        App.events.length >
        200
    ) {

        App.events.shift();

    }

}


// ============================================================
// STATUS
// ============================================================

function setStatus(
    status
) {

    if (
        UI.status
    ) {

        UI.status.textContent =
            status;

    }

}


// ============================================================
// RENDER SERIAL
// ============================================================

function renderSerial() {

    if (!UI.serial)
        return;


    UI.serial.innerHTML =
        "";


    App.serialLines.forEach(
        line => {

            const div =
                document.createElement(
                    "div"
                );


            div.className =
                "serial-line";


            div.innerHTML =

                `<span class="serial-time">` +
                escapeHTML(
                    line.timestamp
                ) +
                `</span> ` +

                `<span>` +
                escapeHTML(
                    line.message
                ) +
                `</span>`;


            UI.serial.appendChild(
                div
            );

        }
    );


    UI.serial.scrollTop =
        UI.serial.scrollHeight;

}


// ============================================================
// RENDER OLED
// ============================================================

function renderOLED() {

    if (!UI.oled)
        return;


    UI.oled.innerHTML =
        "";


    const screen =
        document.createElement(
            "div"
        );


    screen.className =
        "virtual-oled";


    App.oled.lines
        .forEach(
            line => {

                const row =
                    document.createElement(
                        "div"
                    );


                row.textContent =
                    line;


                screen.appendChild(
                    row
                );

            }
        );


    UI.oled.appendChild(
        screen
    );

}


// ============================================================
// RENDER GPIO
// ============================================================

function renderGPIO() {

    if (!UI.gpio)
        return;


    UI.gpio.innerHTML =
        "";


    Object.entries(
        App.gpio
    ).forEach(
        ([pin, data]) => {

            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "gpio-row";


            const indicator =
                document.createElement(
                    "span"
                );


            indicator.className =
                data.state === "HIGH"
                    ? "gpio-high"
                    : "gpio-low";


            row.appendChild(
                indicator
            );


            const label =
                document.createElement(
                    "span"
                );


            label.textContent =
                `GPIO ${pin}`;

            row.appendChild(
                label
            );


            const state =
                document.createElement(
                    "span"
                );


            state.textContent =
                `${data.state} · ${data.mode}`;


            row.appendChild(
                state
            );


            UI.gpio.appendChild(
                row
            );

        }
    );

}


// ============================================================
// RENDER WIFI
// ============================================================

function renderWiFi() {

    if (!UI.wifi)
        return;


    UI.wifi.innerHTML = `

        <div>
            <strong>SSID</strong>
            ${escapeHTML(App.wifi.ssid)}
        </div>

        <div>
            <strong>IP</strong>
            ${App.wifi.ip}
        </div>

        <div>
            <strong>RSSI</strong>
            ${App.wifi.rssi} dBm
        </div>

        <div>
            <strong>State</strong>
            ${App.wifi.connected
                ? "CONNECTED"
                : "DISCONNECTED"}
        </div>

    `;

}


// ============================================================
// RENDER MCU INFORMATION
// ============================================================

function renderMCUInfo() {

    const mcu =
        MCU_DATABASE[
            App.selectedMCU
        ];


    const target =
        document.querySelector(
            "#mcuInfo"
        );


    if (!target)
        return;


    target.innerHTML = `

        <div>
            <strong>Architecture</strong>
            ${mcu.architecture}
        </div>

        <div>
            <strong>CPU</strong>
            ${mcu.cpu}
        </div>

        <div>
            <strong>Flash</strong>
            ${mcu.flash}
        </div>

        <div>
            <strong>RAM</strong>
            ${mcu.ram}
        </div>

        <div>
            <strong>Voltage</strong>
            ${mcu.voltage}
        </div>

        <div>
            <strong>Wi-Fi</strong>
            ${mcu.wifi ? "YES" : "NO"}
        </div>

        <div>
            <strong>Bluetooth</strong>
            ${mcu.bluetooth ? "YES" : "NO"}
        </div>

    `;

}


// ============================================================
// RENDER STATS
// ============================================================

function renderStats() {

    if (!UI.stats)
        return;


    UI.stats.innerHTML = `

        <div>
            Loops:
            ${App.stats.loops}
        </div>

        <div>
            Serial:
            ${App.stats.serialMessages}
        </div>

        <div>
            GPIO Events:
            ${App.stats.gpioEvents}
        </div>

        <div>
            OLED Updates:
            ${App.stats.oledUpdates}
        </div>

        <div>
            WiFi Events:
            ${App.stats.wifiEvents}
        </div>

        <div>
            Errors:
            ${App.stats.errors}
        </div>

    `;

}


// ============================================================
// RENDER EVERYTHING
// ============================================================

function renderAll() {

    renderSerial();

    renderOLED();

    renderGPIO();

    renderWiFi();

    renderStats();

    renderMCUInfo();


    if (UI.runtime) {

        UI.runtime.textContent =
            formatRuntime(
                App.elapsed
            );

    }

}


// ============================================================
// TIME
// ============================================================

function formatRuntime(
    milliseconds
) {

    const seconds =
        Math.floor(
            milliseconds / 1000
        );


    const minutes =
        Math.floor(
            seconds / 60
        );


    const secs =
        seconds % 60;


    return (

        String(minutes)
            .padStart(2, "0")

        + ":" +

        String(secs)
            .padStart(2, "0")

    );

}


// ============================================================
// STRING HELPERS
// ============================================================

function cleanCppString(
    value
) {

    return value
        .trim()
        .replace(/^F\s*\(/, "")
        .replace(/\)$/, "")
        .replace(/^["']/, "")
        .replace(/["']$/, "");

}


function escapeHTML(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ============================================================
// PUBLIC API
// ============================================================

window.VirtualMCU = {

    run:
        runSketch,

    stop:
        stopSketch,

    reset:
        resetSimulation,

    getState:
        () => App,

    getMCU:
        () =>
            MCU_DATABASE[
                App.selectedMCU
            ],

    serial:
        addSerial,

    gpio:
        setGPIO,

    wifi:
        simulateWiFi,

    oled:
        simulateOLED

};


// ============================================================
// AUTO START
// ============================================================

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

}
else {

    initApp();

}
