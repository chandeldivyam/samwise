export const sanitizeFileName = (name: string): string => {
    // Remove or replace characters that are problematic in file names across OS
    return name
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')  // Common invalid characters
      .replace(/^\.+/, '')  // Leading periods
      .replace(/^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i, '_$1')  // Windows reserved names
      .replace(/[\x00-\x1F\x7F]/g, '')  // Control characters
      .replace(/^[\s.]+|[\s.]+$/g, '')  // Leading/trailing spaces and periods
      .replace(/\s+/g, '_')  // Replace spaces with underscores
      .replace(/[.\s]+$/, '')  // Trailing periods and spaces
      .slice(0, 255);  // Maximum filename length
};