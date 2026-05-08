export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_-]+/g, '-') 
    .replace(/^-+|-+$/g, '');
};
export const generateUniqueSlug = (text: string): string => {
  const baseSlug = generateSlug(text);
  const timestamp = Date.now().toString().slice(-6);
  return `${baseSlug}-${timestamp}`;
};
