# Sisyfos Mock Device

Standalone mock audio mixer with a WebSocket control API, bidirectional feedback, and a minimal Web UI for state visualization and manual hardware simulation.

> **Disclaimer:** This device is crude example code bundled so developers can test Sisyfos plugin integration locally. It is not intended as a real mixer simulator or a base for your own project — see [../README.md](../README.md).

## Quick start

```bash
yarn install
yarn dev
```

-   **Web UI (dev):** http://localhost:5173
-   **Web UI (production):** http://localhost:8081
-   **WebSocket API:** ws://localhost:8082

```bash
yarn build
yarn start
```

## Environment variables

| Variable               | Default     | Description                                |
| ---------------------- | ----------- | ------------------------------------------ |
| `HTTP_PORT`            | `8081`      | HTTP server port (serves built UI)         |
| `WS_PORT`              | `8082`      | WebSocket device API port                  |
| `MOCK_CHANNELS`        | `8`         | Number of mixer channels                   |
| `MOCK_INPUT_SELECTORS` | `4`         | Selectable inputs per channel (1-based)    |
| `MOCK_AUX_SENDS`       | `4`         | Aux send buses per channel (0-based index) |
| `MOCK_PRESET_DIR`      | `./storage` | JSON mixer preset files directory          |
| `MOCK_VU_ENABLED`      | `true`      | Simulated VU meter streaming               |
| `MOCK_VU_INTERVAL_MS`  | `50`        | VU update interval (ms)                    |

Copy `.env.example` to `.env` to customize.

## Documentation

| Doc                                                                      | Description                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------ |
| **[docs/internal-api.md](docs/internal-api.md)**                         | WebSocket device protocol (commands, feedback, errors) |
| **[docs/sisyfos-mixer-connection.md](docs/sisyfos-mixer-connection.md)** | Sisyfos `MixerConnection` adapter integration          |

Quick test with wscat:

```bash
npx wscat -c ws://localhost:8082
> {"type":"subscribe","clientType":"sisyfos"}
> {"type":"setFaderLevel","channel":0,"level":0.5}
```

## Web UI

The UI connects with `{ "type": "subscribe", "clientType": "ui" }`. Sisyfos (or wscat) should use `{ "type": "subscribe" }` or `{ "type": "subscribe", "clientType": "sisyfos" }`. The status bar shows both UI and Sisyfos connection state.

-   Displays channel strips with fader, mute, PFL, aux sends, next-aux (read-only), editable name, and preset loader
-   Manual UI changes send commands with `source: "hardware"`
-   Shows a scrollable message log of the last 50 inbound/outbound messages

Set `VITE_WS_URL` when building the UI to override the default WebSocket URL.

## Docker

```bash
docker build -t sisyfos-mock-device .
docker run -p 8081:8081 -p 8082:8082 sisyfos-mock-device
```

## Testing

```bash
yarn test
```

## Protocol commands

-   `setFaderLevel`, `setInputGain`, `setInputSelector`, `setMute`, `setPfl`, `setAMix`, `setNextAux`, `setAuxLevel`, `setChannelName`, `setFx`, `loadMixerPreset`
-   `subscribe`, `resetAll`, `ping`

`setFx` supports all 22 Sisyfos `FxParam` values (EQ, delay, compressor, gain trim) as normalized 0.0–1.0 levels.

-   Simulated VU meters (sine wave, per-channel phase offset) streamed over WebSocket

## Out of scope (v1)

-   Inject command / channel settings
-   Authentication
