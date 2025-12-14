# Flag Issue Fix - Angola

## Problem Identified
Angola was displaying the flag of Seychelles due to an incorrect Wikidata code.

## Root Cause
- Angola was using Wikidata code `Q1042` (which is actually Seychelles)
- Correct Wikidata code for Angola is `Q916`

## Fixes Applied

### 1. Scripts Updated
- ✅ `scripts/data-pipeline.js` - Changed Angola code from `Q1042` to `Q916`
- ✅ `scripts/fetch-flags.js` - Changed Angola code from `Q1042` to `Q916`

### 2. Data Files Updated
- ✅ `public/data/Angola.json` - Updated countryCode to `Q916`
- ✅ `public/data/Angola.json` - Fixed flag URL (now points to Angola flag)
- ✅ `public/data/index.json` - Updated Angola code to `Q916`

## Important Note

⚠️ **The people data in `Angola.json` still contains incorrect entries** (e.g., "Wavel Ramkalawan" who is from Seychelles).

To fix the people data, you need to **regenerate the Angola data**:

```bash
npm run generate-data
```

This will fetch the correct people from Angola using the corrected Wikidata code.

## Verification

The flag has been verified and is now correct:
- Flag URL: `http://commons.wikimedia.org/wiki/Special:FilePath/Flag%20of%20Angola.svg`

## Prevention

To prevent similar issues in the future:
1. Always verify Wikidata codes before adding countries
2. Check that flags match the country name in the URL
3. Review people data to ensure they're from the correct country

