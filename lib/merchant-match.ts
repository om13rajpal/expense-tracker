/**
 * Client-safe merchant name matching utilities.
 *
 * Extracted from lib/categorizer.ts so that client components can use
 * `isSimilarMerchant` without pulling in server-only dependencies
 * (ai-client -> mongodb -> child_process).
 *
 * @module lib/merchant-match
 */

const BANK_PREFIXES = [
  'UPI-', 'UPI/', 'UPI ',
  'NEFT-', 'NEFT/', 'NEFT ',
  'IMPS-', 'IMPS/', 'IMPS ',
  'POS ', 'POS-', 'POS/',
  'ATM-', 'ATM/', 'ATM ',
  'BIL/', 'BIL-', 'BIL ',
  'MMT/', 'MMT-',
  'ECOM/', 'ECOM-',
  'IB/', 'IB-',
  'MB/', 'MB-',
  'ACH/',
  'SI-',
]

export function stripSpaces(text: string): string {
  return text.replace(/\s+/g, '')
}

export function cleanBankText(text: string): string {
  let cleaned = text.trim()

  const upper = cleaned.toUpperCase()
  for (const prefix of BANK_PREFIXES) {
    if (upper.startsWith(prefix)) {
      cleaned = cleaned.slice(prefix.length)
      break
    }
  }

  cleaned = cleaned.replace(/[\s\-/]*\d{6,}[\s]*$/g, '')
  cleaned = cleaned.replace(/[\s\-]*[\w.]+@[\w]+$/i, '')
  cleaned = cleaned.replace(
    /\s+(PVT|LTD|PRIVATE|LIMITED|INDIA|TECHNOLOGIES|TECH|DIGITAL|PAYMENT[S]?|SOLUTION[S]?|SERVICE[S]?|ENTERPRISE[S]?)\b/gi,
    ''
  )
  cleaned = cleaned.replace(
    /[\s\-]+(BAN|BANG|BANGALORE|BENGALURU|MUM|MUMBAI|DEL|DELHI|HYD|HYDERABAD|CHE|CHENNAI|PUN|PUNE|KOL|KOLKATA|GUR|GURGAON|GURUGRAM|NOI|NOIDA|JAI|JAIPUR|AHM|AHMEDABAD|LUC|LUCKNOW|CHD|CHANDIGARH)[\s]*$/gi,
    ''
  )

  return cleaned.trim().toLowerCase()
}

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  if (s1.length === 0 || s2.length === 0) return 0

  const matchDistance = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0)

  const s1Matches = new Array(s1.length).fill(false)
  const s2Matches = new Array(s2.length).fill(false)

  let matches = 0
  let transpositions = 0

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDistance)
    const end = Math.min(i + matchDistance + 1, s2.length)

    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  let k = 0
  for (let i = 0; i < s1.length; i++) {
    if (!s1Matches[i]) continue
    while (!s2Matches[k]) k++
    if (s1[i] !== s2[k]) transpositions++
    k++
  }

  return (
    (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3
  )
}

function jaroWinklerSimilarity(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2)

  let prefix = 0
  for (let i = 0; i < Math.min(s1.length, s2.length, 4); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }

  return jaro + prefix * 0.1 * (1 - jaro)
}

const SIMILARITY_THRESHOLD = 0.88

/**
 * Check if two merchant/description strings refer to the same entity.
 * Uses substring matching and Jaro-Winkler fuzzy similarity.
 */
export function isSimilarMerchant(text1: string, text2: string, minLength = 3): boolean {
  const clean1 = stripSpaces(cleanBankText(text1))
  const clean2 = stripSpaces(cleanBankText(text2))

  if (clean1.length < minLength || clean2.length < minLength) {
    return false
  }

  // 1. Direct substring match (either direction)
  if (clean1.includes(clean2) || clean2.includes(clean1)) {
    return true
  }

  // 2. Space-stripped substring match on raw text
  const stripped1 = stripSpaces(text1.toLowerCase())
  const stripped2 = stripSpaces(text2.toLowerCase())

  if (stripped1.length >= minLength && stripped2.length >= minLength) {
    if (stripped1.includes(stripped2) || stripped2.includes(stripped1)) {
      return true
    }
  }

  // 3. Jaro-Winkler similarity on the cleaned versions
  const shorter = clean1.length <= clean2.length ? clean1 : clean2
  const longer = clean1.length <= clean2.length ? clean2 : clean1

  if (shorter.length >= 4) {
    if (jaroWinklerSimilarity(clean1, clean2) >= SIMILARITY_THRESHOLD) {
      return true
    }

    if (longer.length > shorter.length + 4) {
      for (let i = 0; i <= longer.length - shorter.length; i++) {
        const window = longer.slice(i, i + shorter.length)
        if (jaroWinklerSimilarity(window, shorter) >= SIMILARITY_THRESHOLD) {
          return true
        }
      }
    }
  }

  return false
}
