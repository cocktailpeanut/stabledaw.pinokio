"""Launcher-side backend entrypoint for StableDAW.

Imports the upstream FastAPI app unmodified and overrides one module-level
setting: upstream hardcodes DEFAULT_GENERATION_MODEL = "medium" and refuses
all generation requests until that model has loaded once, which dead-ends
machines that don't have the ~10 GB medium checkpoint (it needs ~8 GB VRAM,
and loads as ~10 GB of fp32 tensors on non-CUDA machines).

The reassignment works without patching upstream because backend.server reads
DEFAULT_GENERATION_MODEL at call time (inside the startup event handler), not
at import time.

Launched by start.js as:  uvicorn server_wrapper:app
Override the default via the STABLEDAW_DEFAULT_MODEL environment variable
(valid values: small, medium, small-rf, medium-rf).
"""

import os

from fastapi import HTTPException

import backend.server as server

server.DEFAULT_GENERATION_MODEL = os.environ.get("STABLEDAW_DEFAULT_MODEL", "small")
server._active_model_name = server.DEFAULT_GENERATION_MODEL

# With SA3_LOCAL_ONLY=1 (set in start.js), a model that hasn't been downloaded
# raises FileNotFoundError. Upstream lets that bubble up as an opaque HTTP 500;
# convert it to a 400 whose `detail` the frontend displays, telling the user
# which launcher button downloads the model.
_orig_load = server._get_or_load_generation_pipeline


def _load_with_friendly_errors(model_name):
    try:
        return _orig_load(model_name)
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Model '{model_name}' is not downloaded. In the Pinokio launcher, "
                "use 'Download Medium Model' / 'Download Medium-RF' — or select "
                "'Small (ARC)', which is installed by default."
            ),
        ) from e


server._get_or_load_generation_pipeline = _load_with_friendly_errors

app = server.app
