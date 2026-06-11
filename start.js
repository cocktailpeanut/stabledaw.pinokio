module.exports = {
  daemon: true,
  run: [
    {
      // FastAPI backend. Port 8600 is required by the app itself: the frontend
      // dev server proxies /api/* to http://localhost:8600 (hardcoded in
      // app/frontend/vite.config.ts), so {{port}} cannot be used here.
      method: "shell.run",
      params: {
        env: {
          // Point the app's local-model search (stable_audio_3/model_configs.py)
          // at the launcher's models folder, where install.js / download-medium.js
          // place the ungated mirror downloads. With this set, generation never
          // needs a Hugging Face token.
          SA3_LOCAL_MODELS_DIR: "{{path.resolve(cwd, 'models')}}",
          // Never fall through to the gated stabilityai repos at runtime: models
          // that aren't downloaded fail instantly with a clear "not found locally"
          // message instead of a Hugging Face 401 traceback.
          SA3_LOCAL_ONLY: "1",
          // Make the launcher-root server_wrapper module importable from app/
          PYTHONPATH: "{{cwd}}"
        },
        path: "app",
        message: [
          // server_wrapper imports the upstream app unmodified but makes the
          // startup model configurable (upstream hardcodes the 10GB "medium"
          // model and blocks all generation until it loads). See server_wrapper.py.
          // --no-sync: don't re-sync the env at startup (install.js owns that,
          // and a default sync would try to build the skipped aubio package).
          "uv run --no-sync uvicorn server_wrapper:app --host 127.0.0.1 --port 8600"
        ],
        on: [{
          // Wait for "Uvicorn running on http://127.0.0.1:8600" before starting the frontend
          event: "/(http:\\/\\/[0-9.:]+)/",
          done: true
        }]
      }
    },
    {
      // Vite frontend. Port 5173 with strictPort is set in app/frontend/vite.config.ts.
      // Running vite directly (instead of `npm run dev`) keeps the host on localhost
      // instead of the 0.0.0.0 the upstream dev script uses.
      method: "shell.run",
      params: {
        env: { },
        path: "app/frontend",
        message: [
          // --host 127.0.0.1 (not the default "localhost"): on macOS Node resolves
          // localhost to IPv6 ::1 only, leaving IPv4 unbound — which breaks
          // Pinokio's https://5173.localhost proxy that forwards to 127.0.0.1.
          // --config: launcher-folder wrapper around the app's vite.config.ts that
          // defaults the generation form to the always-installed "small" model.
          "npx vite --host 127.0.0.1 --config ../../vite.launcher.config.mjs"
        ],
        on: [{
          // Vite prints "Local: http://localhost:5173/"
          event: "/(http:\/\/\\S+)/",
          done: true
        }]
      }
    },
    {
      // This step sets the local variable 'url'.
      // This local variable will be used in pinokio.js to display the "Open WebUI" tab when the value is set.
      method: "local.set",
      params: {
        // the input.event is the regular expression match object from the previous step
        url: "{{input.event[1]}}"
      }
    }
  ]
}
