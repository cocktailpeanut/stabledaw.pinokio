module.exports = {
  run: [
    // Medium RF base model (rectified-flow flavor, used by the UI's "Medium-RF"
    // option and as the LoRA training base; needs ~8 GB VRAM) from the ungated
    // community mirror. The "medium-rf" model key resolves local files named
    // stable-audio-3-medium-RF.{json,safetensors} inside the stable-audio-3-medium
    // folder, and its text conditioner resolves T5Gemma from that same folder —
    // so the mirror downloads into the shared folder and is renamed in place.
    {
      when: "{{!exists('models/stable-audio-3-medium/stable-audio-3-medium-RF.safetensors')}}",
      method: "hf.download",
      params: {
        "_": ["cocktailpeanut/stable-audio-3-medium-base"],
        "local-dir": "models/stable-audio-3-medium"
      }
    },
    {
      when: "{{exists('models/stable-audio-3-medium/model.safetensors')}}",
      method: "shell.run",
      params: {
        path: "models/stable-audio-3-medium",
        message: [
          "node -e \"require('fs').renameSync('model_config.json','stable-audio-3-medium-RF.json')\"",
          "node -e \"require('fs').renameSync('model.safetensors','stable-audio-3-medium-RF.safetensors')\""
        ]
      }
    },
    {
      method: "notify",
      params: {
        html: "Medium-RF model downloaded. Select 'Medium-RF' in the model selector."
      }
    }
  ]
}
