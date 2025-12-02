import { mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { build } from 'esbuild';

const OUT_DIR = join(process.cwd(), '.sim-tmp');
const OUT_FILE = join(OUT_DIR, 'sim.bundle.mjs');

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });
  await build({
    entryPoints: [join(process.cwd(), 'scripts', 'sim.ts')],
    outfile: OUT_FILE,
    bundle: true,
    platform: 'node',
    format: 'esm',
    sourcemap: false,
    target: 'node20'
  });
  await import(pathToFileURL(OUT_FILE).href);
  // optional cleanup to avoid clutter
  await rm(OUT_DIR, { recursive: true, force: true });
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
