const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, 'assets', 'logo.jpg');
const icoPath = path.join(__dirname, 'assets', 'icon.ico');

if (fs.existsSync(imgPath)) {
  const img = fs.readFileSync(imgPath);
  const header = Buffer.from([0x00, 0x00, 0x01, 0x00, 0x01, 0x00]);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0); // 256
  entry.writeUInt8(0, 1); // 256
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(img.length, 8);
  entry.writeUInt32LE(22, 12);
  const ico = Buffer.concat([header, entry, img]);
  fs.writeFileSync(icoPath, ico);
  console.log('Icon written to:', icoPath);
} else {
  console.log('Logo image not found');
}
