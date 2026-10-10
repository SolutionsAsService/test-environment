import { mkdir, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
await mkdir(new URL('dist/', root), {recursive:true});
for (const file of ['index.html','styles.css','app.js','engine.js']) await copyFile(new URL(file,root),new URL('dist/' + file,root));
console.log('Built four static assets in dist/. No compilation or external dependencies.');
