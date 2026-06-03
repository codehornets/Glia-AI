const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const distChrome = path.join(rootDir, 'dist', 'chrome');
const distFirefox = path.join(rootDir, 'dist', 'firefox');

// Clean dist directories
fs.rmSync(path.join(rootDir, 'dist'), { recursive: true, force: true });
fs.mkdirSync(distChrome, { recursive: true });
fs.mkdirSync(distFirefox, { recursive: true });

// 1. Run esbuild for Chrome
console.log('Building for Chrome...');
execSync(`npx esbuild src/content.ts --bundle --outfile=dist/chrome/content.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });
execSync(`npx esbuild src/background.ts --bundle --outfile=dist/chrome/background.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });
execSync(`npx esbuild popup/popup.ts --bundle --outfile=dist/chrome/popup/popup.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });

// 2. Run esbuild for Firefox
console.log('Building for Firefox...');
execSync(`npx esbuild src/content.ts --bundle --outfile=dist/firefox/content.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });
execSync(`npx esbuild src/background.ts --bundle --outfile=dist/firefox/background.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });
execSync(`npx esbuild popup/popup.ts --bundle --outfile=dist/firefox/popup/popup.js --platform=browser --target=es2020`, { stdio: 'inherit', cwd: rootDir });

// 3. Copy static assets (icons, popup html/css)
const copyAssets = (targetDir) => {
  fs.cpSync(path.join(rootDir, 'icons'), path.join(targetDir, 'icons'), { recursive: true });
  fs.mkdirSync(path.join(targetDir, 'popup'), { recursive: true });
  fs.copyFileSync(path.join(rootDir, 'popup', 'popup.html'), path.join(targetDir, 'popup', 'popup.html'));
  if (fs.existsSync(path.join(rootDir, 'popup', 'popup.css'))) {
      fs.copyFileSync(path.join(rootDir, 'popup', 'popup.css'), path.join(targetDir, 'popup', 'popup.css'));
  }
};

copyAssets(distChrome);
copyAssets(distFirefox);

// 4. Generate manifest.json for both
const baseManifest = JSON.parse(fs.readFileSync(path.join(rootDir, 'manifest.json'), 'utf8'));

// Delete existing background to start fresh
delete baseManifest.background;

// Chrome manifest
const chromeManifest = {
  ...baseManifest,
  background: {
    service_worker: "background.js"
  }
};
// Fix content script paths (since they are now in the root of the extension)
chromeManifest.content_scripts[0].js = ["content.js"];

fs.writeFileSync(path.join(distChrome, 'manifest.json'), JSON.stringify(chromeManifest, null, 2));

// Firefox manifest
const firefoxManifest = {
  ...baseManifest,
  background: {
    scripts: ["background.js"]
  },
  browser_specific_settings: {
    gecko: {
      id: "arcrift@eshaan.nair",
      strict_min_version: "109.0"
    }
  }
};
firefoxManifest.content_scripts[0].js = ["content.js"];

fs.writeFileSync(path.join(distFirefox, 'manifest.json'), JSON.stringify(firefoxManifest, null, 2));

console.log('Build complete! Extensions are in dist/chrome and dist/firefox');
