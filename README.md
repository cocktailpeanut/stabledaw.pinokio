# StableDAW (theDAW) — Pinokio Launcher

1-click launcher for [theDAW by GANTASMO](https://github.com/gantasmo/stabledaw), a browser-based AI audio DAW built on **Stable Audio 3**.

## What the app does

theDAW is an all-in-one music creation studio that runs locally:

- **MAKE** — text-to-audio, audio-to-audio, inpainting, and continuation with Stable Audio 3, plus the Chimera engine that blends and beat-aligns multiple clips into one generation
- **EDIT** — multi-track timeline editor with waveforms, trim/fade handles, cut tool, and offline render to WAV
- **MIX** — a chain of 24 FFmpeg effects (mastering, EQ, reverb, lo-fi, LUFS normalization, …) plus the six-family Edit Tool Stack
- **DJ / VJ** — two-deck DJ console with beatmatch sync, hotcues, FX rack; 3D reactive visual engine with camera input
- **TRAIN** — LoRA adapter training (8 adapter types) for the Stable Audio 3 RF base models
- **LEARN** — interactive genealogy graph tracing how every track descended from its sources
- **Library** — every render is saved automatically with its full generation parameters

Architecture: FastAPI backend on port **8600**, React/Vite frontend on port **5173** (the frontend proxies `/api/*` to the backend). Both ports are fixed by the app's own configuration.

## System requirements

| Resource | Requirement |
|---|---|
| OS | Windows (CUDA 12.8 + prebuilt Flash Attention installed automatically), Linux x86_64 (CUDA 12.6), macOS (CPU — Small models only) |
| GPU / VRAM | **Medium** model (1.4B): NVIDIA GPU with ~8 GB VRAM. **Small** models (433M): run on CPU or modest GPUs — this is the built-in low-VRAM path |
| RAM | ~16 GB recommended |
| Disk | ~10–15 GB for the environment + Small models (installed by default), plus ~10.4 GB per optional Medium model |
| Hugging Face | **No token or account needed** — models come from ungated community mirrors (see below) |

**Low VRAM:** no special build is needed. Pick a `small` variant in the model selector (runs on CPU), or shorten the generation duration. Only the Medium model needs ~8 GB VRAM.

## Models — no Hugging Face token needed

The upstream Stable Audio 3 checkpoints (`stabilityai/stable-audio-3-*`) are gated on Hugging Face, but this launcher uses **ungated community mirrors** ([cocktailpeanut/stable-audio-3-*](https://huggingface.co/cocktailpeanut)) downloaded into the launcher's `models/` folder, which the app picks up through its built-in local-model search (`SA3_LOCAL_MODELS_DIR`). No Hugging Face account, license click-through, or token is required. Use of the models remains governed by the [Stability AI Community License](https://stability.ai/license).

The app's model selector maps to local files like this:

| Selector option | Backed by mirror | When it's downloaded | Size | Hardware |
|---|---|---|---|---|
| **Small (ARC)** | `stable-audio-3-small-music` | automatically during Install | ~3.5 GB | CPU or any GPU |
| **Medium (ARC)** | `stable-audio-3-medium` | **Download Medium Model** menu button | ~10.4 GB | NVIDIA, ~8 GB VRAM |
| **Medium-RF** | `stable-audio-3-medium-base` | **Download Medium-RF** menu button | ~10.4 GB | NVIDIA, ~8 GB VRAM (LoRA base) |
| **Small-RF** | — not mirrored | n/a | | selecting it errors (gated upstream) |

Models live in `models/` next to the launcher scripts, so a Reset (which deletes `app/`) does not delete them.

### Startup default model

Upstream hardcodes `medium` as the model loaded at startup and refuses all generation until that load succeeds. Instead of patching the repo, the launcher boots the backend through [server_wrapper.py](server_wrapper.py), which imports the upstream app unchanged and makes the startup model configurable — defaulting to `small` so generation works out of the box on every machine. To change it, add `STABLEDAW_DEFAULT_MODEL=medium` (or another model key) in the launcher's **Configure** tab (the `ENVIRONMENT` file).

## How to use

1. **Install** — clones the repo into `app/`, runs `uv sync` (Python 3.10 env with the correct torch build for your platform), `npm ci` for the frontend, and downloads the Small model (~3.5 GB) from the ungated mirror
2. **Start** — launches the backend (uvicorn via `server_wrapper.py`, port 8600), waits for it to bind, then launches the Vite frontend (port 5173)
3. **Open Web UI** — appears in the sidebar once the frontend prints its URL
4. **Download Medium Model / Download Medium-RF** — optional menu buttons for the GPU-class models (~10 GB each)
5. **Update** — pulls the latest launcher and app code, then re-syncs dependencies
6. **Reset** — deletes the `app/` folder entirely. **Warning:** this also deletes your generated-audio library (`app/data/generations/`). Downloaded models in `models/` are kept.

> The optional Magenta RealTime 2 sidecar (NVIDIA/Linux/WSL2 only) is a git submodule and is not installed by this launcher; the rest of the app works without it.

## API documentation

The backend exposes a full HTTP API on `http://127.0.0.1:8600`. Complete reference: §19 of the [User Guide](https://github.com/gantasmo/stabledaw/blob/main/docs/USER_GUIDE.md).

Generation is job-based: submit with `POST /api/generate-jobs` (multipart form), poll `GET /api/jobs/{id}` until `status` is `completed`, then read the base64 WAV from `result.item.audio_base64`.

Key form fields: `prompt` (required), `model_name` (`small`, `medium`, `medium-rf`), `duration` (seconds), `steps`, `cfg_scale`, `seed` (−1 = random), `batch_size`, plus optional `init_audio` / `inpaint_audio` files.

### Curl

```bash
# Health check
curl http://127.0.0.1:8600/api/health

# Submit a generation job
JOB=$(curl -s -X POST http://127.0.0.1:8600/api/generate-jobs \
  -F prompt="Lo-fi boom bap meets orchestral strings, 84 BPM" \
  -F model_name=small \
  -F duration=30 | python3 -c "import sys,json; print(json.load(sys.stdin)['job']['id'])")

# Poll until completed, then decode the audio
curl -s http://127.0.0.1:8600/api/jobs/$JOB | python3 -c "
import sys, json, base64
j = json.load(sys.stdin)
print(j['status'])
if j['status'] == 'completed':
    open('out.wav','wb').write(base64.b64decode(j['result']['item']['audio_base64']))
"
```

### Python

```python
import time, base64, requests

BASE = "http://127.0.0.1:8600"

job = requests.post(f"{BASE}/api/generate-jobs", data={
    "prompt": "Lo-fi boom bap meets orchestral strings, 84 BPM",
    "model_name": "small",   # CPU-friendly low-VRAM model
    "duration": 30,
}).json()["job"]

while True:
    j = requests.get(f"{BASE}/api/jobs/{job['id']}").json()
    if j["status"] in ("completed", "failed"):
        break
    time.sleep(2)

if j["status"] == "completed":
    audio = base64.b64decode(j["result"]["item"]["audio_base64"])
    open("out.wav", "wb").write(audio)
```

### JavaScript

```javascript
const BASE = "http://127.0.0.1:8600";

const form = new FormData();
form.append("prompt", "Lo-fi boom bap meets orchestral strings, 84 BPM");
form.append("model_name", "small");
form.append("duration", "30");

const { job } = await (await fetch(`${BASE}/api/generate-jobs`, { method: "POST", body: form })).json();

let j;
do {
  await new Promise(r => setTimeout(r, 2000));
  j = await (await fetch(`${BASE}/api/jobs/${job.id}`)).json();
} while (j.status === "queued" || j.status === "running");

if (j.status === "completed") {
  const bytes = Uint8Array.from(atob(j.result.item.audio_base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: j.result.item.mime_type }); // audio/wav
}
```

## Troubleshooting

- **"API UNREACHABLE" banner** — the backend is not on port 8600 yet (first start imports torch and can take a while). Check `curl http://127.0.0.1:8600/api/health`.
- **Port already in use** — the app requires ports 8600 and 5173 to be free (Vite runs with `strictPort`). Stop whatever occupies them and Start again.
- **Generation error after selecting Medium / Medium-RF** — that model isn't downloaded yet; use the matching **Download** menu button first. `Small-RF` is not mirrored and requires gated upstream access via an HF token.
- **Out-of-memory on Medium** — switch to a `small` model, shorten `duration`, or free competing CUDA processes.
- **Static/glitch output on Medium (Windows)** — Flash Attention is not installed correctly; re-run Install (it comes from a prebuilt wheel via `uv sync`).
- Launcher execution logs live in the `logs/` folder of this launcher.
