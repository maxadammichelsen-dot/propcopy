#!/usr/bin/env node
/**
 * Offline verification for Intagsrapport extraction + PII filter.
 * Monkey-patches pdf-parse so we can feed synthetic text without a real PDF.
 * Run: node scripts/verify-intagsrapport.js
 */

// ── 1. Register @/ path aliases ─────────────────────────────────────────────
const { register } = require('tsconfig-paths')
const { compilerOptions } = require('../tsconfig.json')
register({
  baseUrl: process.cwd(),
  paths: compilerOptions.paths,
})

// ── 2. Monkey-patch pdf-parse before any import resolves it ─────────────────
const Module = require('module')
const _original = Module._load
const MOCK_PDF_FN = async (buffer) => ({ text: buffer.toString('utf8'), numpages: 5 })
Module._load = function(request, parent, isMain) {
  // Intercept both the package entry and the internal path used by the lazy loader.
  // The internal path is accessed via dynamic import() which expects a module with
  // a .default export; the package entry is accessed via require() which expects
  // the function directly.
  if (request === 'pdf-parse') return MOCK_PDF_FN
  // __esModule: true prevents TypeScript's __importStar from wrapping the module
  // again (which would make mod.default an object instead of the function).
  if (request === 'pdf-parse/lib/pdf-parse.js') return { __esModule: true, default: MOCK_PDF_FN }
  return _original.apply(this, arguments)
}

// ── 3. Register TypeScript → ts-node ────────────────────────────────────────
require('/opt/node22/lib/node_modules/ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
    esModuleInterop: true,
    paths: compilerOptions.paths,
    baseUrl: process.cwd(),
  },
})

// ── 4. Now safe to require the real extraction module ────────────────────────
const { extractIntagsrapport, scoreConfidence } = require('../lib/pdf-extraction/intagsrapport')
const { formatMarketIntelligenceForPrompt, formatMarketConfirmationCard } = require('../lib/market-intelligence-formatter')

// ── 5. Synthetic Intagsrapport text ──────────────────────────────────────────
// Structured to match realistic Värderingsdata PDF output.
const SYNTHETIC_TEXT = `
Intagsrapport
Husviksvägen 67, Brännö 3:172

Bedömt marknadsvärde    4 310 000 kr
83 000 kr/kvm

Statistisk tillförlitlighet: Låg

Prisutveckling
3 mån: +3%
6 mån: +5%
12 mån: +2%
24 mån: +11%

Annonseringstid: 63 dagar

Sålts i området
Skogsgapet 70              2025-11-04  4 850 000  4 900 000  52  0  834  93 800  1 370 000  1,13
Husviksvägen 23            2025-08-15  3 950 000  3 980 000  48  0  0   82 300  1 100 000  1,05
Brannövägen 12             2025-06-20  4 200 000  4 230 000  55  0  900  76 400  1 200 000  1,08
Strandvägen 4              2025-04-10  3 600 000  3 640 000  45  0  0   80 000  990 000   1,02
Husviksvägen 45            2025-03-05  4 100 000  4 140 000  51  0  750  80 400  1 150 000  1,07
Skogsgapet 45              2024-12-18  3 750 000  3 810 000  47  0  0   79 800  1 060 000  1,04
Brannövägen 33             2024-11-09  4 400 000  4 480 000  56  0  920  78 600  1 230 000  1,10
Husviksvägen 18            2024-09-22  3 500 000  3 560 000  44  0  0   79 500  980 000   1,01
Strandvägen 19             2024-08-14  3 800 000  3 850 000  49  0  0   77 600  1 070 000  1,04
Skogsgapet 62              2024-06-30  4 050 000  4 100 000  53  0  870  76 400  1 140 000  1,06
Till salu i området
Skogsgapet 11     11 750 000  213 636  55  5
Husviksvägen 99   9 800 000  190 196  51  4
Brannövägen 5     7 950 000  176 667  45  3
Strandvägen 22    12 500 000  220 588  57  5
Husviksvägen 71   8 200 000  188 506  43  4
Skogsgapet 33     6 900 000  172 500  40  3
Brannövägen 44    10 100 000  196 116  51  5
Husviksvägen 55   8 750 000  189 130  46  4
Strandvägen 8     13 200 000  228 965  58  5
Skogsgapet 80     7 400 000  175 595  42  3

Copyright Värderingsdata 2025
`

// ── PII-poisoned variants for negative test ──────────────────────────────────
const PII_PERSONNUMMER = 'Säljare: Johan Svensson 830415-1234'
const PII_LANENUMMER = 'Lån: 345-678901-23 Handelsbanken'

// ── 6. Run tests ─────────────────────────────────────────────────────────────
let passed = 0
let failed = 0

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${label}`)
    passed++
  } else {
    console.error(`  ✗ ${label}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

async function run() {
  console.log('\n══════════════════════════════════════════════════════')
  console.log('  PR 2c-1 VERIFICATION — Intagsrapport extraction')
  console.log('══════════════════════════════════════════════════════\n')

  // ── Test 1: marker check — non-Värderingsdata PDF returns null ──────────────
  console.log('TEST 1: Non-Värderingsdata PDF rejected')
  const nonVD = await extractIntagsrapport(Buffer.from('Just some random PDF text without the marker'))
  assert('returns null for missing Värderingsdata marker', nonVD === null)

  // ── Test 2: scalar field extraction ─────────────────────────────────────────
  console.log('\nTEST 2: Scalar field extraction')
  const result = await extractIntagsrapport(Buffer.from(SYNTHETIC_TEXT, 'utf8'))
  assert('result is not null', result !== null)
  if (!result) { console.error('Cannot continue — extraction returned null'); process.exit(1) }

  const d = result.data
  assert(`bedomt_marknadsvarde = 4310000 (got ${d.bedomt_marknadsvarde})`, d.bedomt_marknadsvarde === 4_310_000)
  assert(`bedomt_marknadsvarde_kr_per_kvm = 83000 (got ${d.bedomt_marknadsvarde_kr_per_kvm})`, d.bedomt_marknadsvarde_kr_per_kvm === 83_000)
  assert(`statistisk_tillforlitlighet = 'lag' (got '${d.statistisk_tillforlitlighet}')`, d.statistisk_tillforlitlighet === 'lag')
  assert(`snitt_annonseringstid_dagar = 63 (got ${d.snitt_annonseringstid_dagar})`, d.snitt_annonseringstid_dagar === 63)
  assert(`prisutveckling_24m ≈ 0.11 (got ${d.prisutveckling_24m})`, Math.abs((d.prisutveckling_24m ?? 0) - 0.11) < 0.001)
  assert(`prisutveckling_12m ≈ 0.02 (got ${d.prisutveckling_12m})`, Math.abs((d.prisutveckling_12m ?? 0) - 0.02) < 0.001)
  assert(`prisutveckling_6m ≈ 0.05 (got ${d.prisutveckling_6m})`, Math.abs((d.prisutveckling_6m ?? 0) - 0.05) < 0.001)
  assert(`prisutveckling_3m ≈ 0.03 (got ${d.prisutveckling_3m})`, Math.abs((d.prisutveckling_3m ?? 0) - 0.03) < 0.001)

  // ── Test 3: comparable sales ─────────────────────────────────────────────────
  console.log('\nTEST 3: Comparable sales extraction')
  assert(`10 comparables extracted (got ${d.jamforbara_forsaljningar.length})`, d.jamforbara_forsaljningar.length === 10)
  const first = d.jamforbara_forsaljningar[0]
  if (first) {
    assert(`first comparable adress contains 'Skogsgapet' (got '${first.adress}')`, first.adress.includes('Skogsgapet'))
    assert(`first comparable forsaljningsdatum = '2025-11-04' (got '${first.forsaljningsdatum}')`, first.forsaljningsdatum === '2025-11-04')
    assert(`first comparable pris_kr = 4850000 (got ${first.pris_kr})`, first.pris_kr === 4_850_000)
  }

  // ── Test 4: listings for sale ────────────────────────────────────────────────
  console.log('\nTEST 4: Listings for sale extraction')
  assert(`10 listings extracted (got ${d.till_salu_i_omradet.length})`, d.till_salu_i_omradet.length === 10)
  const firstListing = d.till_salu_i_omradet[0]
  if (firstListing) {
    assert(`first listing adress contains 'Skogsgapet' (got '${firstListing.adress}')`, firstListing.adress.includes('Skogsgapet'))
    assert(`first listing utgangspris_kr = 11750000 (got ${firstListing.utgangspris_kr})`, firstListing.utgangspris_kr === 11_750_000)
    assert(`first listing adress includes house number (got '${firstListing.adress}')`, firstListing.adress === 'Skogsgapet 11')
    assert(`first listing antal_rum = 5 (got ${firstListing.antal_rum})`, firstListing.antal_rum === 5)
  }

  // ── Test 5: confidence scoring ───────────────────────────────────────────────
  console.log('\nTEST 5: Confidence scoring')
  assert(`confidence = 'high' (got '${result.confidence}')`, result.confidence === 'high')

  // ── Test 6: PII filter — personnummer ────────────────────────────────────────
  console.log('\nTEST 6: PII filter — personnummer')
  const piiText = SYNTHETIC_TEXT + '\n' + PII_PERSONNUMMER + '\n'
  const piiResult = await extractIntagsrapport(Buffer.from(piiText, 'utf8'))
  if (piiResult) {
    const allAdresses = [
      ...piiResult.data.jamforbara_forsaljningar.map(s => s.adress),
      ...piiResult.data.till_salu_i_omradet.map(l => l.adress),
    ]
    const hasPII = allAdresses.some(a => /\d{6,8}[-\s]\d{4}/.test(a))
    assert('personnummer NOT present in any extracted address', !hasPII)
    console.log(`    (checked ${allAdresses.length} addresses)`)
  }

  // ── Test 7: PII filter — loan number ────────────────────────────────────────
  console.log('\nTEST 7: PII filter — loan number pattern')
  const loanText = SYNTHETIC_TEXT + '\n' + PII_LANENUMMER + '\n'
  const loanResult = await extractIntagsrapport(Buffer.from(loanText, 'utf8'))
  if (loanResult) {
    const allAdresses = [
      ...loanResult.data.jamforbara_forsaljningar.map(s => s.adress),
      ...loanResult.data.till_salu_i_omradet.map(l => l.adress),
    ]
    const hasLoan = allAdresses.some(a => /\d{3,6}[-–]\d{6,}[-–]\d{1,2}/.test(a))
    assert('loan number NOT present in any extracted address', !hasLoan)
  }

  // ── Test 8: formatMarketIntelligenceForPrompt ────────────────────────────────
  console.log('\nTEST 8: formatMarketIntelligenceForPrompt')
  const promptBlock = formatMarketIntelligenceForPrompt(d)
  assert('block contains Värderingsdata', promptBlock.includes('Värderingsdata'))
  // sv-SE locale uses narrow no-break space (U+202F or U+00A0) as thousands separator
  const normalizedBlock = promptBlock.replace(/[    ]/g, ' ')
  assert('block contains 4 310 000', normalizedBlock.includes('4 310 000'))
  assert('block contains 83 000 kr/kvm', promptBlock.includes('83') && promptBlock.includes('kr/kvm'))
  assert('block contains Låg / låg', promptBlock.toLowerCase().includes('låg') || promptBlock.toLowerCase().includes('lag'))
  assert('block contains 63 dagar', promptBlock.includes('63'))
  assert('block contains +11', promptBlock.includes('+11'))
  assert('block contains 24 mån', promptBlock.includes('24'))
  assert('low-reliability rule in block', promptBlock.includes('bedömt till') || promptBlock.includes('värderat till'))
  assert('rule about source in block', promptBlock.includes('Ange Värderingsdata'))

  // ── Test 9: formatMarketConfirmationCard ─────────────────────────────────────
  console.log('\nTEST 9: formatMarketConfirmationCard')
  const card = formatMarketConfirmationCard(d)
  assert(`title = 'Intagsrapport — Värderingsdata' (got '${card.title}')`, card.title === 'Intagsrapport — Värderingsdata')
  const rowLabels = card.rows.map(r => r.label)
  assert('has "Bedömt marknadsvärde" row', rowLabels.includes('Bedömt marknadsvärde'))
  assert('has "Statistisk tillförlitlighet" row', rowLabels.includes('Statistisk tillförlitlighet'))
  assert('has "Prisutveckling 24 mån" row', rowLabels.some(l => l.includes('24')))
  assert('has "Snitt annonseringstid" row', rowLabels.includes('Snitt annonseringstid'))
  assert('has "Jämförbara försäljningar" row', rowLabels.includes('Jämförbara försäljningar'))
  assert('has "Till salu i området" row', rowLabels.includes('Till salu i området'))
  const mvRow = card.rows.find(r => r.label === 'Bedömt marknadsvärde')
  if (mvRow) {
    assert(`marknadsvärde row contains 4310000 (got '${mvRow.value}')`, mvRow.value.replace(/\s/g,'').includes('4310000'))
    assert(`marknadsvärde row contains 83000 kr/kvm (got '${mvRow.value}')`, mvRow.value.replace(/\s/g,'').includes('83000'))
  }
  const tillRow = card.rows.find(r => r.label === 'Statistisk tillförlitlighet')
  if (tillRow) {
    assert(`tillförlitlighet row = 'Låg' (got '${tillRow.value}')`, tillRow.value === 'Låg')
  }

  // ── Test 10: negative — empty marknadsdata ───────────────────────────────────
  console.log('\nTEST 10: formatMarketIntelligenceForPrompt — empty data')
  const empty = { bedomt_marknadsvarde: undefined, bedomt_marknadsvarde_kr_per_kvm: undefined, statistisk_tillforlitlighet: undefined, prisutveckling_3m: undefined, prisutveckling_6m: undefined, prisutveckling_12m: undefined, prisutveckling_24m: undefined, snitt_annonseringstid_dagar: undefined, jamforbara_forsaljningar: [], till_salu_i_omradet: [] }
  const emptyBlock = formatMarketIntelligenceForPrompt(empty)
  assert('empty data produces empty string', emptyBlock === '')

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log('\n══════════════════════════════════════════════════════')
  console.log(`  RESULT: ${passed} passed, ${failed} failed`)
  console.log('══════════════════════════════════════════════════════\n')

  if (failed > 0) {
    console.log('EXTRACTED DATA DUMP:')
    console.log(JSON.stringify({ scalars: { bedomt_marknadsvarde: d.bedomt_marknadsvarde, bedomt_marknadsvarde_kr_per_kvm: d.bedomt_marknadsvarde_kr_per_kvm, statistisk_tillforlitlighet: d.statistisk_tillforlitlighet, snitt_annonseringstid_dagar: d.snitt_annonseringstid_dagar, prisutveckling_3m: d.prisutveckling_3m, prisutveckling_6m: d.prisutveckling_6m, prisutveckling_12m: d.prisutveckling_12m, prisutveckling_24m: d.prisutveckling_24m }, comparables_count: d.jamforbara_forsaljningar.length, first_comparable: d.jamforbara_forsaljningar[0], listings_count: d.till_salu_i_omradet.length, first_listing: d.till_salu_i_omradet[0] }, null, 2))
    console.log('\nCONFIRMATION CARD ROWS:')
    console.log(JSON.stringify(card.rows, null, 2))
    process.exit(1)
  }
}

run().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
