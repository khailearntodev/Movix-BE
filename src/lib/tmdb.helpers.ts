export const getTmdbImageUrl = (path: string | null | undefined): string => {
  if (!path) {
    return "/images/poster-placeholder.png"; 
  }
  return `https://image.tmdb.org/t/p/w500${path}`;
};