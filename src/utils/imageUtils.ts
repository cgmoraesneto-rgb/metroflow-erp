
/**
 * Converts a remote URL to a base64 string.
 * Used to pre-load images for jsPDF since its addImage is synchronous when using base64
 * but can be problematic with remote URLs in synchronous PDF generation.
 */
export const urlToBase64 = async (url: string): Promise<string> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    return url; // Fallback to original URL
  }
};
