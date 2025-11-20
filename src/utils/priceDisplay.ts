/**
 * Formats price with GST percentage for display
 * @param price - The price to display
 * @param gstPercentage - The GST percentage (0-100)
 * @returns Formatted string like "₹150 (GST 12%)"
 */
export const formatPriceWithGST = (
  price: number, 
  gstPercentage: number | null | undefined
): string => {
  const gst = gstPercentage ?? 0;
  const formattedPrice = `₹${price.toFixed(2)}`;
  const formattedGST = `(GST ${gst}%)`;
  
  return `${formattedPrice} ${formattedGST}`;
};

/**
 * Formats just the GST badge text
 */
export const formatGSTBadge = (gstPercentage: number | null | undefined): string => {
  const gst = gstPercentage ?? 0;
  return `GST ${gst}%`;
};
