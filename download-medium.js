module.exports = {
  run: [
    // Medium model (1.4B, needs ~8 GB VRAM) from the ungated community mirror
    {
      when: "{{!exists('models/stable-audio-3-medium/stable-audio-3-medium-ARC.safetensors')}}",
      method: "hf.download",
      params: {
        "_": ["cocktailpeanut/stable-audio-3-medium"],
        "local-dir": "models/stable-audio-3-medium"
      }
    },
    // The "medium" model key resolves local files by the upstream ARC filenames
    // (see stable_audio_3/model_configs.py _local_override), while the mirror ships
    // model_config.json / model.safetensors. Rename in place (node is bundled with
    // Pinokio; renameSync is instant and needs no extra disk, unlike fs.copy).
    {
      when: "{{exists('models/stable-audio-3-medium/model.safetensors')}}",
      method: "shell.run",
      params: {
        path: "models/stable-audio-3-medium",
        message: [
          "node -e \"require('fs').renameSync('model_config.json','stable-audio-3-medium-ARC.json')\"",
          "node -e \"require('fs').renameSync('model.safetensors','stable-audio-3-medium-ARC.safetensors')\""
        ]
      }
    },
    {
      method: "notify",
      params: {
        html: "Medium model downloaded. Select 'Medium (ARC)' in the model selector."
      }
    }
  ]
}
