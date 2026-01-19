import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Compresses a base64 image string to target a specific file size (approx 50KB)
 * @param {string} base64Str - The original base64 string
 * @param {number} maxWidth - Max width of the output image
 * @param {number} maxHeight - Max height of the output image
 * @param {number} quality - Initial quality (0.1 - 1.0)
 * @returns {Promise<string>} - Compressed base64 string
 */
export async function compressImage(base64Str, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Resize if necessary
            if (width > height) {
                if (width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Export to JPEG with quality adjustment
            let compressed = canvas.toDataURL('image/jpeg', quality);

            // If still too large (approximate size check), reduce quality further
            // (Base64 is ~1.33x larger than binary)
            const approxSize = (compressed.length * 3) / 4;
            if (approxSize > 50000 && quality > 0.1) {
                resolve(compressImage(base64Str, maxWidth * 0.8, maxHeight * 0.8, quality * 0.7));
            } else {
                resolve(compressed);
            }
        };
    });
}
