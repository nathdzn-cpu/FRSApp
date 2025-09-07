export const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatPostcode = (postcode: string | null | undefined): string => {
  if (!postcode) return '';
  return postcode.toUpperCase();
};

export const formatAddressPart = (str: string | null | undefined): string => {
  return toTitleCase(str);
};

// Formats a numeric value to a GBP currency string (e.g., 123.45 -> "£123.45")
export const formatGBPDisplay = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) {
    return '';
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

// Parses a raw input string into a numeric value, applying cleaning rules
export const parseCurrencyInput = (rawInput: string): number | null => {
  if (!rawInput) {
    return null;
  }

  // 1. Remove non-numeric characters except for the first decimal point
  let cleanedValue = '';
  let hasDecimal = false;
  for (let i = 0; i < rawInput.length; i++) {
    const char = rawInput[i];
    if (char >= '0' && char <= '9') {
      cleanedValue += char;
    } else if (char === '.' && !hasDecimal) {
      cleanedValue += char;
      hasDecimal = true;
    }
  }

  // 2. Strip leading zeros (e.g., "040" -> "40", "0.5" -> ".5" then "0.5")
  if (cleanedValue.length > 1 && cleanedValue.startsWith('0') && cleanedValue[1] !== '.') {
    cleanedValue = cleanedValue.replace(/^0+/, '');
    if (cleanedValue === '') cleanedValue = '0'; // Handle case where input was "000"
  }

  // If the cleaned value is just a decimal point, treat as "0."
  if (cleanedValue === '.') {
    cleanedValue = '0.';
  }

  const numericValue = parseFloat(cleanedValue);
  return isNaN(numericValue) ? null : numericValue;
};