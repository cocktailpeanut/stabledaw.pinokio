module.exports = {
  run: [{
    method: "shell.run",
    params: {
      message: "git pull"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app",
      message: "git pull"
    }
  }, {
    // Re-sync dependencies in case pyproject.toml / uv.lock changed upstream.
    // aubio is excluded from the sync (source-only package that needs a C
    // compiler) and attempted separately in the next step, same as install.js.
    method: "shell.run",
    params: {
      path: "app",
      message: "uv sync --no-install-package aubio"
    }
  }, {
    // Optional aubio build: "break": false ignores a failed build so the
    // update continues; the app falls back to librosa without aubio.
    method: "shell.run",
    params: {
      path: "app",
      message: "uv pip install aubio",
      on: [{
        "event": "/error:/i",
        "break": false
      }]
    }
  }, {
    method: "shell.run",
    params: {
      path: "app/frontend",
      message: "npm ci"
    }
  }]
}
