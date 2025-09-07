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