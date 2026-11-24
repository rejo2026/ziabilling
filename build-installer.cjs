const { execSync } = require('child_process');
const path = require('path');

console.log('Building Zia-Billing Windows Installation Setup (.exe)...');
try {
  execSync('npx electron-builder --win nsis', { stdio: 'inherit', cwd: __dirname });
  console.log('\nSUCCESS: Installation file created in dist-electron/Zia-Billing-Setup-1.0.0.exe');
} catch (err) {
  console.error('ERROR building installer:', err.message);
  process.exit(1);
}
