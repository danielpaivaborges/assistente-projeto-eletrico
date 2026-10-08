import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await Promise.all([
  copyFile('src/engine/electrical-engine.js', 'dist/engine.js'),
  copyFile('src/app.js', 'dist/app.js')
]);

console.log('Arquivos do navegador atualizados em dist/.');
