const PLACEHOLDER_POSTER = "/images/placeholder-poster.png";
const PLACEHOLDER_BACKDROP = "/images/placeholder-backdrop.png";
const PLACEHOLDER_AVATAR = "/images/placeholder-avatar.png";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

export const getMovieImageUrl = (
  path: string | null | undefined,
  type: "poster" | "backdrop" = "poster"
): string => {
  if (path) {
    if (path.startsWith("http")) {
      return path;
    }
    return `${TMDB_IMAGE_BASE_URL}${path}`;
  }
  
  return type === "poster" ? PLACEHOLDER_POSTER : PLACEHOLDER_BACKDROP;
};

export const getPersonAvatarUrl = (
  path: string | null | undefined
): string => {
  if (path) {
    if (path.startsWith("http")) {
      return path;
    }
    return `${TMDB_IMAGE_BASE_URL}${path}`;
  }
  
  return PLACEHOLDER_AVATAR;
};