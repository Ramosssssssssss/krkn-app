/**
 * Formats a folio string by removing leading zeros between the prefix and the first non-zero number.
 * Example: "ITO000290" -> "ITO290"
 * 
 * @param folio The folio string to format
 * @returns The formatted folio
 */
export function formatFolio(folio: string | undefined | null): string {
    if (!folio) return '';

    // Find the position of the last letter
    const lastLetterMatch = folio.match(/[A-Za-z](?=[^A-Za-z]*$)/);
    if (!lastLetterMatch || lastLetterMatch.index === undefined) {
        // If no letters, just remove leading zeros from the whole string
        return folio.replace(/^0+/, '');
    }

    const lastLetterPos = lastLetterMatch.index;
    const prefix = folio.substring(0, lastLetterPos + 1);
    const rest = folio.substring(lastLetterPos + 1);

    // Remove leading zeros from the numeric part, but keep at least one if it's all zeros
    let formattedRest = rest.replace(/^0+/, '');
    if (rest.length > 0 && formattedRest === '') {
        formattedRest = '0';
    }

    return prefix + formattedRest;
}
