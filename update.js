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
    // aubio is skipped for the same reason as in install.js (source-only package
    // that needs a C compiler; the app falls back to librosa without it).
    method: "shell.run",
    params: {
      path: "app",
      message: "uv sync --no-install-package aubio"
    }
  }, {
    method: "shell.run",
    params: {
      path: "app/frontend",
      message: "npm ci"
    }
  }]
}
