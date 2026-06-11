module.exports = {
  run: [{
    // Stop the app first: a running backend can recreate folders (e.g. app/data)
    // mid-deletion, leaving a partial app/ that breaks the next install.
    method: "script.stop",
    params: {
      uri: "start.js"
    }
  }, {
    method: "fs.rm",
    params: {
      path: "app"
    }
  }]
}
