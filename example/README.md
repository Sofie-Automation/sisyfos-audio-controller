# Sisyfos mock stack

Runnable example for local development: a mock WebSocket mixer (`device/`) and the Sisyfos plugin (`plugin/`) that connects to it.

Both folders are self-contained packages with their own `package.json` and `yarn.lock`. They are **not** part of the root Yarn workspaces.

> **Disclaimer:** The plugin and device here are very crude. They exist mainly to exercise and develop Sisyfos plugin integration locally. They are included as a **reference example only** — not as production code or a foundation to build your own project on top of. For the minimum plugin shape, see [Docs/example-mixer-plugin/README.md](../Docs/example-mixer-plugin/README.md).

## Quick start

```bash
# Terminal 1 — mock device
cd example/device && yarn install && yarn dev

# Plugin build (once, from repo root)
cd example/plugin && yarn install && yarn build

# Terminal 2 — Sisyfos (from repo root)
yarn build:server
export SISYFOS_PLUGIN_PATH="$PWD/example"
yarn start:local
```

Open Sisyfos at http://localhost:1176/?settings=1 and configure:

| Setting        | Value                                       |
| -------------- | ------------------------------------------- |
| Mixer protocol | **Mock WebSocket Device** (`mockWebSocket`) |
| Mixer URL      | `ws://localhost:8082`                       |
| Channels       | 8                                           |

Mock device Web UI (dev): http://localhost:5173

## Layout

```
example/
  device/    mock WebSocket mixer + Web UI
  plugin/    Sisyfos mixer plugin
```

`SISYFOS_PLUGIN_PATH` points at `example/`. The server loads `plugin/` (has `manifest.json`) and skips `device/` automatically.

## Plugin path alternatives

```bash
export SISYFOS_PLUGIN_PATH="/path/to/sisyfos-audio-controller/example"
# or
yarn start:local -- --plugin-path "/path/to/sisyfos-audio-controller/example"
```

If the plugin is moved outside this repo, set the host root explicitly:

```bash
export SISYFOS_ROOT="/path/to/sisyfos-audio-controller"
```

## More detail

-   [plugin/README.md](plugin/README.md) — plugin setup, supported MixerConnection methods
-   [device/README.md](device/README.md) — device WebSocket API, env vars
-   [Docs/example-mixer-plugin/README.md](../Docs/example-mixer-plugin/README.md) — minimal plugin skeleton
