/**
 * Computes aggregation on a dataset for a specified column and function.
 * Supports: Sum, Average, Count, Count Distinct, Minimum, Maximum, Median
 */
export function computeAggregationValue(data, func, columnKey) {
  if (!Array.isArray(data) || data.length === 0) return 0;

  // Extract raw values for the column
  const rawValues = data.map((row) => {
    let val = row[columnKey];
    if (val === undefined || val === null) return null;
    return val;
  });

  // Numeric values
  const numericValues = rawValues
    .map((v) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const cleaned = v.replace(/,/g, '').trim();
        const n = parseFloat(cleaned);
        return isNaN(n) ? null : n;
      }
      return null;
    })
    .filter((n) => n !== null);

  switch (func) {
    case 'Sum': {
      if (numericValues.length === 0) return 0;
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      return sum % 1 === 0 ? sum.toLocaleString() : sum.toFixed(2);
    }

    case 'Average': {
      if (numericValues.length === 0) return 0;
      const sum = numericValues.reduce((acc, curr) => acc + curr, 0);
      const avg = sum / numericValues.length;
      return avg % 1 === 0 ? avg.toLocaleString() : avg.toFixed(2);
    }

    case 'Count': {
      const nonNull = rawValues.filter((v) => v !== null && v !== '' && v !== '-');
      return nonNull.length.toLocaleString();
    }

    case 'Count Distinct': {
      const nonNull = rawValues.filter((v) => v !== null && v !== '' && v !== '-');
      const unique = new Set(nonNull.map((v) => String(v).toLowerCase()));
      return unique.size.toLocaleString();
    }

    case 'Minimum': {
      if (numericValues.length > 0) {
        return Math.min(...numericValues).toLocaleString();
      }
      const strVals = rawValues.filter((v) => v !== null && v !== '').sort();
      return strVals[0] || '-';
    }

    case 'Maximum': {
      if (numericValues.length > 0) {
        return Math.max(...numericValues).toLocaleString();
      }
      const strVals = rawValues.filter((v) => v !== null && v !== '').sort();
      return strVals[strVals.length - 1] || '-';
    }

    case 'Median': {
      if (numericValues.length === 0) return 0;
      const sorted = [...numericValues].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median =
        sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      return median % 1 === 0 ? median.toLocaleString() : median.toFixed(2);
    }

    default:
      return 0;
  }
}

