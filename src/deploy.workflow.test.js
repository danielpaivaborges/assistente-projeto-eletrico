const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowPath = path.join(__dirname, '..', '.github', 'workflows', 'deploy-pages.yml');
const workflow = fs.readFileSync(workflowPath, 'utf8');

assert.match(workflow, /actions\/configure-pages@v5/);
assert.match(workflow, /actions\/upload-pages-artifact@v3/);
assert.match(workflow, /actions\/deploy-pages@v4/);
assert.match(workflow, /run: npm run check/);
assert.match(workflow, /path: \.\/dist/);
assert.match(workflow, /pages: write/);
assert.match(workflow, /id-token: write/);

console.log('✓ Fluxo de publicacao no GitHub Pages verificado.');
