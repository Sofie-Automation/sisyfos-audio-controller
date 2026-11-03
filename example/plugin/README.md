# Sisyfos Mock WebSocket Plugin

Mixer plugin that connects Sisyfos to the bundled mock device in [`../device/`](../device/) over WebSocket.

> **Disclaimer:** This plugin is crude example code for developing plugin integration against the bundled mock device. Do not treat it as a template to fork or build a product on — see [../README.md](../README.md) and [Docs/example-mixer-plugin/README.md](../../Docs/example-mixer-plugin/README.md) instead.

This package is self-contained — own `package.json`, lockfile, and `node_modules`. It is not part of the root Yarn workspaces.

## Setup

```bash
# From this directory
yarn install
yarn build

# From sisyfos repo root — build the host server
yarn build:server
```

See also [../README.md](../README.md) for the full mock stack quick start.

## Load the plugin

Point Sisyfos at the parent folder containing this plugin directory. Use either:

**Environment variable** (absolute path):

```bash
export SISYFOS_PLUGIN_PATH="/path/to/sisyfos-audio-controller/example"
```

**Command-line argument** (works with `yarn start:dev` — note the `--`):

```bash
yarn start:dev -- --plugin-path "/path/to/sisyfos-audio-controller/example"
```

Also accepts `--sisyfos-plugin-path` and `--plugin-path=/path` forms. CLI paths are searched before the env var.

If the plugin is not stored at `example/plugin/` relative to the Sisyfos repo, set the host root explicitly:

```bash
export SISYFOS_ROOT="/path/to/sisyfos-audio-controller"
```

Restart the Sisyfos server after setting env vars.

## Sisyfos settings

| Setting        | Value                                        |
| -------------- | -------------------------------------------- |
| Mixer protocol | **Mock WebSocket Device** (`mockWebSocket`)  |
| Mixer URL      | `ws://localhost:8082`                        |
| Channels       | 8 (match `MOCK_CHANNELS` on the mock device) |

## Test against mock device

```bash
# Terminal 1 — mock device
cd example/device && yarn dev

# Terminal 2 — Sisyfos (from repo root)
export SISYFOS_PLUGIN_PATH="$PWD/example"
yarn start:local
```

Verify:

-   Sisyfos fader moves update the mock device UI
-   Mock Web UI hardware moves (`source: "hardware"`) update Sisyfos
-   FX controls in the channel strip update the mock device (`setFx`)
-   Mock Web UI FX moves update Sisyfos (`SET_FADER_FX`)
-   Input gain control updates the mock device (`setInputGain`)
-   Mock Web UI input gain moves update Sisyfos (`SET_INPUT_GAIN`)
-   Input selector buttons update the mock device (`setInputSelector`)
-   Mock Web UI input selector moves update Sisyfos (`SET_INPUT_SELECTOR`)
-   AMix button updates the mock device (`setAMix`) when **IN 3.ROW BUTTON** is set to **Amix**
-   Mock Web UI AMix moves update Sisyfos (`SET_AMIX`)
-   Aux send levels update the mock device (`setAuxLevel`)
-   Mock Web UI aux level moves update Sisyfos (`SET_AUX_LEVEL`)
-   VU meters in Sisyfos track mock device `vuLevel` streaming (0.0–1.0)
-   Mixer online indicator reflects WebSocket connect/disconnect
-   Plugin appears in Settings mixer protocol dropdown

## Manual WebSocket test

```bash
npx wscat -c ws://localhost:8082
> {"type":"subscribe","clientType":"sisyfos"}
> {"type":"setFaderLevel","channel":0,"level":0.5}
```

## Supported MixerConnection methods

| Method                | Device command                                                |
| --------------------- | ------------------------------------------------------------- |
| `updateFadeIOLevel`   | `setFaderLevel`                                               |
| `updateInputGain`     | `setInputGain`                                                |
| `updateInputSelector` | `setInputSelector`                                            |
| `updateMuteState`     | `setMute`                                                     |
| `updatePflState`      | `setPfl`                                                      |
| `updateAMixState`     | `setAMix`                                                     |
| `updateNextAux`       | `setNextAux`                                                  |
| `updateAuxLevel`      | `setAuxLevel`                                                 |
| `updateChannelName`   | `setChannelName`                                              |
| `updateFx`            | `setFx`                                                       |
| `loadMixerPreset`     | reads JSON from Sisyfos `storage/`, applies to device + Redux |

Presets use the mock device JSON format (`{ "channels": [...] }`). **IMPORT** uploads to Sisyfos storage; **LOAD** reads from there (not the mock device preset folder).

Inbound hardware feedback updates Redux:

-   `fx` → `SET_FADER_FX`
-   `inputGain` → `SET_INPUT_GAIN`
-   `inputSelector` → `SET_INPUT_SELECTOR`
-   `amixOn` → `SET_AMIX`
-   `auxLevel` → `SET_AUX_LEVEL`

`presetLoaded` is logged on the server (no Redux dispatch).

All other interface methods are no-ops (v1).

The protocol exposes `presetFileExtension: 'json'` so **STORAGE → MIXER PRESETS** appears in the Sisyfos UI, plus `CHANNEL_INPUT_GAIN`, `CHANNEL_INPUT_SELECTOR` (4 inputs), `CHANNEL_AMIX`, `AUX_LEVEL`, and all 22 `FxParam` values.

## Dependency model

-   **npm deps** (`ws`, etc.): installed locally in this folder
-   **Sisyfos host API** (`store`, `mainClasses`, `logger`): resolved at runtime from `{SISYFOS_ROOT}/server/dist/server/src/` via `sisyfosHost.ts`
