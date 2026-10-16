import { cp, mkdir, rm } from 'node:fs/promises';

// Always ship resources from the same installed PDF.js version as the parser.
export async function preparePdfAssets() {
  const source = new URL('../node_modules/pdfjs-dist/', import.meta.url);
  const target = new URL('../public/pdfjs/', import.meta.url);
  // This directory is generated and ignored by Git. Rebuild it from scratch so
  // repeated macOS copies cannot accumulate " 2", " 3" duplicate filenames.
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const folder of ['cmaps', 'standard_fonts', 'wasm']) {
    await cp(new URL(folder, source), new URL(folder, target), { recursive: true });
  }
  await cp(new URL('legacy/build/pdf.worker.min.mjs', source), new URL('pdf.worker.min.mjs', target));
}
