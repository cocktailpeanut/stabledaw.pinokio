// Launcher-side Vite config for StableDAW. Lives ONLY in the launcher folder —
// nothing is copied into the cloned app/ repo. start.js runs vite from
// app/frontend with `--config ../../vite.launcher.config.mjs`.
//
// It imports the app's own vite.config.ts unchanged and adds one compile-time
// override: the generation form's default model becomes "small" (upstream
// defaults to "medium", which fresh installs don't have downloaded, so the
// first generate click would fail). The replacement happens in Vite's
// transform pipeline; the original source file on disk is never modified.
//
// Deliberately imports nothing from 'vite' (no defineConfig/mergeConfig):
// bare imports in this file would resolve against the launcher folder, which
// has no node_modules. The app config's own imports resolve against
// app/frontend as usual.
import base from './app/frontend/vite.config';

const launcherDefaultModel = {
  name: 'launcher-default-model',
  enforce: 'pre',
  transform(code, id) {
    if (id.replace(/\\/g, '/').endsWith('src/state/generateParamsStore.ts')) {
      const patched = code.replace(/model:\s*['"]medium['"]/, "model: 'small'");
      if (patched === code) {
        console.warn('[launcher] generateParamsStore default-model pattern not found; upstream may have changed — keeping original default');
        return;
      }
      return patched;
    }
  },
};

export default async (env) => {
  const resolved = typeof base === 'function' ? await base(env) : base;
  return {...resolved, plugins: [...(resolved.plugins ?? []), launcherDefaultModel]};
};
