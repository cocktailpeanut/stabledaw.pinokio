module.exports = {
  requires: {
    bundle: "ai"
  },
  run: [
    // Edit this step to customize the git repository to use
    {
      when: "{{!exists('app')}}",
      method: "shell.run",
      params: {
        message: [
          "git clone https://github.com/gantasmo/stabledaw app",
        ]
      }
    },
    // Python dependencies.
    // StableDAW is a uv-native project: `uv sync` reads pyproject.toml + uv.lock and
    // installs the correct torch build per platform via [tool.uv.sources]
    // (CUDA 12.8 + prebuilt Flash Attention wheel on Windows, CUDA 12.6 on Linux x86_64,
    // default PyPI build on macOS). requirements.txt is a Windows-only pip freeze,
    // so uv sync is the only cross-platform install path the project supports.
    {
      method: "shell.run",
      params: {
        path: "app",
        message: [
          // aubio 0.4.9 ships source-only on PyPI (no wheels for any platform) and
          // needs a C compiler most machines don't have (MSVC on Windows). The app
          // treats aubio as optional — beat detection falls back to librosa — so
          // skip it instead of requiring a build toolchain.
          "uv sync --no-install-package aubio"
        ]
      }
    },
    // Frontend dependencies (package-lock.json is committed, npm ci reproduces it exactly)
    {
      method: "shell.run",
      params: {
        path: "app/frontend",
        message: [
          "npm ci"
        ]
      }
    },
    // Small (CPU-friendly) Stable Audio 3 model from an ungated community mirror,
    // so no Hugging Face token or license gate is needed. The app's UI offers the
    // model keys small / medium / small-rf / medium-rf, and its local-model search
    // (stable_audio_3/model_configs.py, via SA3_LOCAL_MODELS_DIR set in start.js)
    // expects models/stable-audio-3-small/stable-audio-3-small-ARC.{json,safetensors}
    // for the "small" key — hence the download dir and the renames below.
    // The Medium variants are optional downloads via download-medium.js / download-medium-rf.js.
    {
      when: "{{!exists('models/stable-audio-3-small/stable-audio-3-small-ARC.safetensors')}}",
      method: "hf.download",
      params: {
        "_": ["cocktailpeanut/stable-audio-3-small-music"],
        "local-dir": "models/stable-audio-3-small"
      }
    },
    {
      when: "{{exists('models/stable-audio-3-small/model.safetensors')}}",
      method: "shell.run",
      params: {
        path: "models/stable-audio-3-small",
        message: [
          "node -e \"require('fs').renameSync('model_config.json','stable-audio-3-small-ARC.json')\"",
          "node -e \"require('fs').renameSync('model.safetensors','stable-audio-3-small-ARC.safetensors')\""
        ]
      }
    },
    // The model config's text conditioner points at the mirror repo
    // cocktailpeanut/stable-audio-3-small-music, so the local-model search looks
    // for a folder named stable-audio-3-small-music for the bundled T5Gemma.
    // Alias it to the stable-audio-3-small folder ('junction' works without admin
    // on Windows and falls back to a plain symlink on macOS/Linux).
    {
      when: "{{!exists('models/stable-audio-3-small-music')}}",
      method: "shell.run",
      params: {
        path: "models",
        message: [
          "node -e \"require('fs').symlinkSync(require('path').resolve('stable-audio-3-small'),'stable-audio-3-small-music','junction')\""
        ]
      }
    }
  ]
}
