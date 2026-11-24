const fs = require('fs');

// One-time import: if a legacy data.json sits next to the resolved DB file and
// the DB is still empty, copy the json to a .bak (never delete the original)
// and load its collections into the database.
function migrateLegacyJson(db, { legacyJsonFile, isDbEmpty, persistState, defaultState }) {
  if (!isDbEmpty(db)) return { migrated: false };
  if (!legacyJsonFile || !fs.existsSync(legacyJsonFile)) return { migrated: false };

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(legacyJsonFile, 'utf-8'));
  } catch (e) {
    console.error('Legacy data.json found but could not be parsed, skipping import:', e.message);
    return { migrated: false, error: e.message };
  }

  try {
    fs.copyFileSync(legacyJsonFile, `${legacyJsonFile}.bak`);
  } catch (e) {
    console.error('Could not back up legacy data.json before import:', e.message);
  }

  const merged = { ...defaultState, ...legacy };
  persistState(merged);
  console.log(`Imported legacy data from ${legacyJsonFile} into the database (backup saved as ${legacyJsonFile}.bak).`);
  return { migrated: true, state: merged };
}

module.exports = { migrateLegacyJson };
