import { copyFile, cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('src/engine/electrical-engine.js', 'dist/engine.js'),
  copyFile('src/app.js', 'dist/app.js'),
  cp('src/assets', 'dist/assets', { recursive: true, force: true })
]);

console.log('Arquivos do navegador atualizados em dist/.');
