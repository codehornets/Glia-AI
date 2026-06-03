const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'package.json',
  'dashboard/package.json',
  'dashboard/src-tauri/tauri.conf.json',
  'dashboard/src-tauri/Cargo.toml',
  'backend/package.json',
  'extension/package.json',
  'extension/manifest.json',
  'bin/setup.js',
  'ROADMAP.md',
  'README.md',
  'CHANGELOG.md',
  'backend/src/index.ts',
  'backend/src/mcp/server.ts',
  'backend/src/routes/rag.ts',
  'extension/popup/popup.ts',
  'extension/src/background.ts',
  'extension/src/content.ts'
];

for (const file of filesToUpdate) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const newContent = content.replace(/1\.6\.2/g, '1.6.3');
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.warn(`File not found: ${file}`);
  }
}
