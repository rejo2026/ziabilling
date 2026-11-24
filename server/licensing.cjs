const crypto = require('crypto');
const os = require('os');

/**
 * Zia-Billing Hardware Fingerprint & System ID Generator
 * Generates a consistent, hardware-bound machine identifier.
 */
function getSystemHardwareId() {
  const cpus = os.cpus();
  const cpuModel = cpus && cpus.length > 0 ? cpus[0].model : 'GENERIC_CPU';
  const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024)); // in GB
  const networkInterfaces = os.networkInterfaces();
  
  let macAddress = '00:00:00:00:00:00';
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
        macAddress = net.mac;
        break;
      }
    }
    if (macAddress !== '00:00:00:00:00:00') break;
  }

  const rawSeed = `${cpuModel}|${totalMem}GB|${os.hostname()}|${macAddress}`;
  const hash = crypto.createHash('sha256').update(rawSeed).digest('hex').toUpperCase();

  // Format into standard formatted product hardware key: ZB-XXXX-XXXX-XXXX
  const systemId = `ZB-${hash.substring(0, 4)}-${hash.substring(4, 8)}-${hash.substring(8, 12)}`;
  return {
    systemId,
    details: {
      cpuModel,
      totalMemGB: totalMem,
      hostname: os.hostname(),
      mac: macAddress
    }
  };
}

/**
 * Public RSA key used to verify activation keys signed by the vendor's
 * private key (kept offline, outside this repo/app — see
 * scripts/generate-license.cjs). Replace this with your own generated
 * public key; it is safe to ship inside the app.
 */
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArbDvKzIB3Q2RbciRZb6u
v3QggkjAPB/j4jam+BOkyTAum63EntzJy/ys9q56glJO5/sxolbKSWufKaWJwnR/
jth8i0/7/W0jHKY+/CbFCawoXQgG82q0hJINGuM9waIgcGYtcXgb0LkX7GS3SHMi
OcI7AHs7Jgl46sqkqxen4jcj2u50IlTAPmFDPsyoYXfbrRB5Hb9qRz3aPpUQsc6U
2E4Ph7qc+Wrd7/oJQRXuTyD88DK8N8kJOe63af0e/+LdnTtW7wv7UO57ZUbOOIpP
FDiz3kNYr8j/9nQBkQ8r7cLRZmJDDqWyuO6GpVKYmTJUInYjIIysNeoR69YyEVfo
tQIDAQAB
-----END PUBLIC KEY-----`;

/**
 * Validate an offline activation key.
 *
 * Key format: "<base64url payload JSON>.<base64url RSA-SHA256 signature>",
 * where payload = { systemId, plan, validFrom, validTo, maxUsers, features }.
 * Only a key signed by the holder of the matching private key will verify.
 */
function verifyActivationKey(licenseKey) {
  try {
    const parts = String(licenseKey).trim().split('.');
    if (parts.length !== 2) {
      return { valid: false, reason: 'Invalid activation key format.' };
    }
    const [payloadPart, signaturePart] = parts;

    const isValidSignature = crypto.verify(
      'sha256',
      Buffer.from(payloadPart, 'base64url'),
      PUBLIC_KEY,
      Buffer.from(signaturePart, 'base64url')
    );
    if (!isValidSignature) {
      return { valid: false, reason: 'Activation key signature is invalid.' };
    }

    const rawJson = Buffer.from(payloadPart, 'base64url').toString('utf-8');
    const license = JSON.parse(rawJson);

    const currentMachine = getSystemHardwareId();
    if (license.systemId !== currentMachine.systemId) {
      return { valid: false, reason: `System ID mismatch. This key belongs to ${license.systemId}` };
    }

    const now = new Date();
    const validFrom = new Date(license.validFrom);
    const validTo = new Date(license.validTo);

    if (now < validFrom) {
      return { valid: false, reason: 'License is not active yet.' };
    }
    if (now > validTo) {
      return { valid: false, reason: `License expired on ${license.validTo}. Please renew.` };
    }

    return {
      valid: true,
      license: {
        plan: license.plan,
        maxUsers: license.maxUsers,
        validUntil: license.validTo,
        features: license.features || {
          invoicing: true,
          billing: true,
          inventory: true,
          leadsAutomation: true,
          salesAutomation: true,
          refundAutomation: true,
          supportAutomation: true
        }
      }
    };
  } catch (err) {
    return { valid: false, reason: 'Invalid or corrupt license key string.' };
  }
}

module.exports = {
  getSystemHardwareId,
  verifyActivationKey
};
