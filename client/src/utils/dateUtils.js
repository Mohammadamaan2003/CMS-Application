/**
 * Universal date formatter for the application.
 * Formats dates into DD-MMM-YYYY format, e.g. "20-JUL-2026" / "20-OCT-2026", matching Oracle APEX standards.
 */
export function formatAppDate(val) {
  if (!val || val === '-' || val === 'null' || val === 'undefined') return '';
  const str = String(val).trim();
  if (!str) return '';

  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Check if already in DD-MMM-YYYY or DD MMM YYYY format, e.g. "20-JUL-2026" or "20 Oct 2026"
  const mmmMatch = str.match(/^(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})$/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mon = mmmMatch[2].toUpperCase();
    const yr = mmmMatch[3];
    return `${day}-${mon}-${yr}`;
  }

  // Check if "M/D/YYYY" or "MM/DD/YYYY"
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) {
    const [m, d, y] = str.split('/').map(Number);
    if (m >= 1 && m <= 12) {
      return `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`;
    }
  }

  // Check if "YYYY-MM-DD" or ISO date string
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const yr = isoMatch[1];
    const m = parseInt(isoMatch[2], 10);
    const day = isoMatch[3];
    if (m >= 1 && m <= 12) {
      return `${day}-${MONTHS[m - 1]}-${yr}`;
    }
  }

  // General Date parse fallback
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const mon = MONTHS[parsed.getMonth()];
    const yr = parsed.getFullYear();
    return `${day}-${mon}-${yr}`;
  }

  return str;
}

