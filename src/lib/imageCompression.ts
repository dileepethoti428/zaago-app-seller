import imageCompression from 'browser-image-compression';

/**
 * Compress image files before upload to reduce storage costs and improve upload times
 * @param file - The original image file to compress
 * @returns Compressed image file
 */
export const compressImage = async (file: File): Promise<File> => {
  try {
    const originalSizeKB = (file.size / 1024).toFixed(2);
    console.log(`🔄 Compressing image: ${file.name} (${originalSizeKB} KB)`);

    const options = {
      maxSizeMB: 1,              // Maximum file size: 1MB
      maxWidthOrHeight: 1920,     // Maximum dimension: 1920px (Full HD)
      useWebWorker: true,         // Use web worker for better performance
      fileType: 'image/jpeg' as const,     // Convert to JPEG for better compression
      initialQuality: 0.8,        // Quality: 80% (excellent visual quality)
    };

    const compressedFile = await imageCompression(file, options);
    
    const compressedSizeKB = (compressedFile.size / 1024).toFixed(2);
    const reductionPercent = (((file.size - compressedFile.size) / file.size) * 100).toFixed(1);
    
    console.log(`✅ Compression complete: ${originalSizeKB} KB → ${compressedSizeKB} KB (${reductionPercent}% reduction)`);
    
    return compressedFile;
  } catch (error) {
    console.warn('⚠️ Image compression failed, using original file:', error);
    // Return original file if compression fails
    return file;
  }
};
