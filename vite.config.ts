import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function scanRelativeFiles(baseDir: string, exts: Set<string>, prefix = ''): string[] {
  if (!fs.existsSync(baseDir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(baseDir, {withFileTypes: true})) {
    const full = path.join(baseDir, entry.name);
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...scanRelativeFiles(full, exts, rel));
    } else if (exts.has(path.extname(entry.name).toLowerCase())) {
      out.push(rel);
    }
  }
  return out;
}

function createAssetManifestPlugin(): Plugin {
  const modelExts = new Set(['.glb', '.gltf']);
  const audioExts = new Set(['.mp3', '.ogg', '.wav']);

  const buildManifest = (subdir: 'models' | 'audio') => {
    const dir = path.resolve(import.meta.dirname, 'public', subdir);
    const exts = subdir === 'models' ? modelExts : audioExts;
    return JSON.stringify({files: scanRelativeFiles(dir, exts)}, null, 2);
  };

  return {
    name: 'chuno-public-asset-manifests',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url === '/models/manifest.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(buildManifest('models'));
          return;
        }
        if (req.url === '/audio/manifest.json') {
          res.setHeader('Content-Type', 'application/json');
          res.end(buildManifest('audio'));
          return;
        }
        next();
      });
    },
    closeBundle(error?: Error) {
      if (error) return;
      const distDir = path.resolve(import.meta.dirname, 'dist');
      if (!fs.existsSync(distDir)) return;
      for (const subdir of ['models', 'audio'] as const) {
        const targetDir = path.join(distDir, subdir);
        fs.mkdirSync(targetDir, {recursive: true});
        fs.writeFileSync(path.join(targetDir, 'manifest.json'), buildManifest(subdir), 'utf-8');
      }
    },
  };
}

export default defineConfig(() => {
  return {
    base: './',
    plugins: [
      react(),
      tailwindcss(),
      createAssetManifestPlugin(),
      // Copies src/assets into dist/ so root-relative URLs like
      // "/src/assets/images/..." (e.g. generate_image output) still resolve
      // in production builds. Do not remove.
      {
        name: 'copy-unbundled-src-assets',
        apply: 'build',
        closeBundle(error?: Error): void {
          if (error) {
            return;
          }
          const distDir = path.resolve(import.meta.dirname, 'dist');
          const srcAssets = path.resolve(import.meta.dirname, 'src/assets');
          const distAssets = path.resolve(distDir, 'src/assets');
          if (fs.existsSync(distDir) && fs.existsSync(srcAssets)) {
            fs.cpSync(srcAssets, distAssets, {recursive: true, force: true});
          }
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
