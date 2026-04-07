export default function FormatArtist(data) {
  // Handle edge cases
  if (!data || !Array.isArray(data) || data.length === 0) {
    return 'Unknown Artist';
  }

  let artist = '';
  data.map((e, i) => {
    // Ensure each artist object has a name property and is valid
    if (!e || typeof e !== 'object') {
      return; // Skip invalid entries
    }
    const artistName = String(e?.name || 'Unknown Artist');
    if (i === data.length - 1) {
      artist += artistName;
    } else {
      artist += artistName + ', ';
    }
  });

  // Return fallback if artist string is empty
  return artist || 'Unknown Artist';
}
