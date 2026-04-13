/**
 * Get the full file URL, handling both absolute URLs and relative paths
 */
export const getFileUrl = (fileUrl: string): string => {
  if (fileUrl.startsWith('http')) {
    return fileUrl;
  }
  // Extract base URL without /api suffix for static files (uploads)
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  const baseUrl = API_BASE_URL.replace(/\/api$/, ''); // Remove /api suffix if present
  return `${baseUrl}${fileUrl}`;
};

/**
 * Parse aspect ratio from template (e.g., "4:5", "9:16", "1:1", "16:9")
 */
export const parseAspectRatio = (ratio: string): number => {
  const parts = ratio.split(':');
  if (parts.length === 2) {
    const w = parseFloat(parts[0]);
    const h = parseFloat(parts[1]);
    if (w > 0 && h > 0) {
      return h / w; // Return height/width ratio
    }
  }
  return 5 / 4; // Default to 4:5 if parsing fails
};

/**
 * Party / brand logo on the template editor is only for Politician and Brand profiles
 * (matches `user.category` from the API: e.g. "politicians", "brand").
 */
export function profileCategoryShowsPartyLogo(category: string | null | undefined): boolean {
  const c = (category || '').toLowerCase().trim().replace(/\s+/g, '-');
  return c === 'politicians' || c === 'politician' || c === 'brand';
}

/**
 * Get user's full name from user object
 */
export const getUserFullName = (user: any): string => {
  if (!user) return '';
  
  const parts: string[] = [];
  if (user.title) parts.push(user.title);
  if (user.first_name) parts.push(user.first_name);
  if (user.middle_name) parts.push(user.middle_name);
  if (user.last_name) parts.push(user.last_name);
  
  return parts.join(' ').trim() || 'User';
};
