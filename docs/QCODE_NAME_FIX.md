# Q Code Name Fix

## Problem Identified
Several entries in the quiz data had Wikidata Q codes (like "Q129591") instead of proper names. This occurred when Wikidata's label service failed to return a proper English label.

## Affected Entries

1. **Australia**: Q129591 → **Hugh Jackman** ✅
2. **Greece**: Q128297 (appeared twice) → **Maria Callas** ✅
3. **Belgium**: Q49747 → **Maurice Maeterlinck** ✅
4. **Belgium**: Q7836 → Already had proper name ✅
5. **Peru**: Q539 → **Giuseppe Garibaldi** ✅
6. **Poland**: Q444 → **Lech Wałęsa** ✅

## Root Cause

The SPARQL query uses `SERVICE wikibase:label` which should provide `?personLabel`, but sometimes:
1. The service returns the entity ID (Q code) instead of a label
2. The service returns a label in a non-English language
3. The label service times out or fails

## Fixes Applied

### 1. Data Files Fixed
- ✅ `public/data/Australia.json` - Fixed Hugh Jackman
- ✅ `public/data/Greece.json` - Fixed Maria Callas (2 entries)
- ✅ Other files already had correct names after script run

### 2. Data Pipeline Improved
- ✅ Updated `scripts/data-pipeline.js` to:
  - Add fallback label fetching with `rdfs:label`
  - Better handling of Q code detection
  - Improved error handling for missing labels

### 3. Fix Script Created
- ✅ Created `scripts/fix-qcode-names.js` to:
  - Automatically detect Q codes in data files
  - Fetch proper names from Wikidata
  - Update answer keys accordingly

## Prevention

The updated data pipeline now:
1. Uses `rdfs:label` as a fallback if `personLabel` is missing
2. Detects Q codes and attempts to fetch proper labels
3. Validates that names are not Q codes before saving

## Verification

All Q codes have been verified and fixed:
- ✅ No entries with Q codes as names remain
- ✅ All names are in English (or proper transliterations)
- ✅ Answer keys are properly normalized

## Future Maintenance

If this issue occurs again:
1. Run `node scripts/fix-qcode-names.js` to automatically fix all Q codes
2. Check the output for any non-English names that need manual correction
3. Regenerate data for affected countries if needed

