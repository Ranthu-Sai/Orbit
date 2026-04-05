export default function FormatTitleAndArtist(data) {
  if (!data) {
    return '';
  }
  return data
    .toString()
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', 'and')
    .replaceAll('&#039;', "'")
    .replaceAll('&trade;', '™');
}

// Reusable text truncation utility
export function truncateText(text, limit = 20) {
  if (!text) {
    return '';
  }
  return text.length > limit ? text.substring(0, limit) + '...' : text;
}
