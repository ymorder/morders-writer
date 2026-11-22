export function sanitizeArticleText(markdown: string): {
  cleaned: string;
  emDashesRemoved: number;
} {
  const matches = markdown.match(/—|\s[-–]\s/g);
  const count = matches ? matches.length : 0;
  const cleaned = markdown
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/i, "")
    // 1. Replace non-breaking hyphens (\u2011) and en-dashes (\u2013) with standard hyphen
    .replace(/[\u2010\u2011\u2012\u2013]/g, "-")
    // 2. Replace narrow no-break spaces (\u202F, \u2009)
    .replace(/[\u202F\u2009]+%/g, "%")
    .replace(/[\u202F\u2009]/g, " ")
    // 3. In Markdown headings (# ... - ...), if preceded by ? or ! or :, just remove the dash! Otherwise convert spaced dash to colon (: )
    .replace(/^(#{1,4}\s+.+?[?!:])\s*(?:—|-)\s+/gm, "$1 ")
    .replace(/^(#{1,4}\s+[^\n]+?)\s+(?:—|-)\s+/gm, "$1: ")
    // 4. If an em-dash or spaced hyphen follows ?, !, :, ., or , -> remove the dash without adding a comma!
    .replace(/([?!:.,])\s*(?:—|-)\s+/g, "$1 ")
    // 5. Remaining em-dashes (—) and spaced hyphens ( - ) in prose become ", "
    .replace(/\s*—\s*/g, ", ")
    .replace(/\s+-\s+/g, ", ")
    // 6. Strip any comma that appears after ?, !, ., or : (fixes "?, " and ":, ")
    .replace(/([?!.:])\s*,+/g, "$1")
    .replace(/,\s*,+/g, ",")
    // 7. Fix future-tense 2026 phrasing, bare "סייבר ב-2026", and broken "נקודת מפנה" clichés in Hebrew
    .replace(/מה עומד לקרות ב-?2026\?/g, "מה קורה בפועל ב-2026?")
    .replace(/מה עומד לקרות ב-?2026/g, "מה קורה בפועל ב-2026")
    .replace(/מה צפוי לקרות ב-?2026/g, "מה מתרחש ב-2026")
    .replace(/(^|\n)סייבר ב(?:שנת )?-?2026/g, "$1תחום הסייבר בשנת 2026")
    .replace(/צפוי להיות נקודת מפנה/g, "עובר שינוי מעשי עמוק")
    .replace(/צפויה להיות נקודת מפנה/g, "עוברת שינוי מעשי עמוק")
    .replace(/הוא נקודת מפנה/g, "עובר שינוי משמעותי")
    // 8. Fix common Hebrew construct-state (סמיכות) & gender agreement slips
    .replace(/בשתי המוצרים/g, "בשני המוצרים")
    .replace(/שתי מוצרים/g, "שני מוצרים")
    .replace(/שתי מסלולים/g, "שני מסלולים")
    .replace(/שתי אפיקים/g, "שני אפיקים")
    .replace(/מהקרן הפנסיה/g, "מקרן הפנסיה")
    .replace(/הקרן הפנסיה/g, "קרן הפנסיה")
    .replace(/הקופת גמל/g, "קופת הגמל")
    .replace(/מהקופת גמל/g, "מקופת הגמל")
    .trim();
  return { cleaned, emDashesRemoved: count };
}
