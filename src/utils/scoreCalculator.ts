export function calculateScore(event: {
  banner_url?: string;
  photos?: string[];
  description?: string;
  distances?: any[];
  kit_items?: string[];
  additional_info?: string;
  registration_deadline?: string;
  location?: string;
  sponsor?: string;
  current_participants?: number;
}): number {
  let score = 0;
  const photos = event.photos || (event.banner_url ? [event.banner_url] : []);

  if (photos.length >= 1) score += 20;
  if (photos.length >= 3) score += 10;
  if (event.description && event.description.length > 200) score += 15;
  if (event.distances && event.distances.length > 1) score += 10;
  if (event.kit_items && event.kit_items.length > 0) score += 10;
  if (event.additional_info && event.additional_info.length > 30) score += 10;
  if (event.registration_deadline) score += 5;
  if (event.location && event.location.length > 5) score += 5;
  if (event.sponsor) score += 5;
  if ((event.current_participants || 0) >= 50) score += 10;

  return Math.min(score, 100);
}

export function scoreBadge(score: number): { label: string; color: string; bg: string } {
  if (score >= 91) return { label: `⭐ ${score}/100`, color: '#92400e', bg: '#C9A84C' };
  if (score >= 71) return { label: `${score}/100`, color: '#fff', bg: '#16a34a' };
  if (score >= 41) return { label: `${score}/100`, color: '#fff', bg: '#C9A84C' };
  return { label: `${score}/100`, color: '#fff', bg: '#9ca3af' };
}
