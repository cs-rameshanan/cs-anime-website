import "dotenv/config";
import axios from "axios";
import FormData from "form-data";
import { csClient } from "./csClient.js";
import path from "path";
import { resolveMediaUrl, isStackCdnUrl } from "../lib/imageUtils.js";

/**
 * Contentstack Manga Asset Upload Script
 * 
 * This script:
 * 1. Fetches all manga entries with external cover image URLs
 * 2. Downloads images from external URLs
 * 3. Uploads them to Contentstack as assets
 * 4. Updates manga entries to use Contentstack CDN URLs
 */

const DRY_RUN = process.env.DRY_RUN === "true";
const ASSET_FOLDER_UID = process.env.CONTENTSTACK_ASSET_FOLDER_UID || null;

/**
 * Download image from URL and return as buffer
 */
async function downloadImage(imageUrl) {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ContentstackImporter/1.0)',
      },
    });

    const urlPath = new URL(imageUrl).pathname;
    let filename = path.basename(urlPath) || 'image.jpg';
    
    if (!filename.includes('.')) {
      const contentType = response.headers['content-type'] || 'image/jpeg';
      const ext = contentType.split('/')[1] || 'jpg';
      filename = `${filename}.${ext}`;
    }

    return {
      buffer: Buffer.from(response.data),
      contentType: response.headers['content-type'] || 'image/jpeg',
      filename,
    };
  } catch (error) {
    console.error(`  ❌ Failed to download image: ${error.message}`);
    throw error;
  }
}

/**
 * Upload image buffer to Contentstack as asset
 */
async function uploadAsset(buffer, filename, contentType, title, description = "") {
  const form = new FormData();
  
  form.append('asset[upload]', buffer, {
    filename,
    contentType,
  });
  
  form.append('asset[title]', title);
  form.append('asset[description]', description);
  
  if (ASSET_FOLDER_UID) {
    form.append('asset[parent_uid]', ASSET_FOLDER_UID);
  }

  try {
    const response = await axios.post(
      `${process.env.CONTENTSTACK_BASE_URL || 'https://api.contentstack.io/v3'}/assets`,
      form,
      {
        headers: {
          ...form.getHeaders(),
          api_key: process.env.CONTENTSTACK_API_KEY,
          authorization: process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
          ...(process.env.CONTENTSTACK_AUTHTOKEN && { authtoken: process.env.CONTENTSTACK_AUTHTOKEN }),
        },
      }
    );

    return response.data.asset;
  } catch (error) {
    console.error(`  ❌ Failed to upload asset:`, error.response?.data || error.message);
    throw error;
  }
}

/**
 * Check if an asset already exists for this manga
 */
async function findExistingAsset(malId) {
  try {
    const response = await csClient.get(`/assets`, {
      params: {
        query: JSON.stringify({ title: { $regex: `manga-${malId}-` } }),
      },
    });
    
    if (response.data.assets && response.data.assets.length > 0) {
      return response.data.assets[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Update manga entry with new asset URL
 */
async function updateMangaWithAsset(entryUid, assetUid, assetUrl) {
  try {
    await csClient.put(`/content_types/manga/entries/${entryUid}`, {
      entry: {
        cover_asset: assetUid,   // If you have a file field
        cover_image: assetUrl,   // Keep URL for backward compatibility
      },
    });
    console.log(`  ✅ Updated manga entry with CDN asset`);
  } catch (error) {
    console.error(`  ❌ Failed to update manga:`, error.response?.data || error.message);
  }
}

/**
 * Process a single manga entry
 */
async function processManga(manga) {
  console.log(`\n📖 Processing: ${manga.title}`);
  
  const coverUrl =
    resolveMediaUrl(manga.cover_image) || resolveMediaUrl(manga.cover_asset);

  if (!coverUrl) {
    console.log(`  ⏭ No cover image URL, skipping`);
    return;
  }

  if (isStackCdnUrl(coverUrl)) {
    console.log(`  ⏭ Already using Contentstack CDN`);
    return;
  }

  // Check for existing asset
  const existingAsset = await findExistingAsset(manga.mal_id);
  if (existingAsset) {
    console.log(`  ⏭ Asset already exists, updating entry...`);
    if (!DRY_RUN) {
      await updateMangaWithAsset(manga.uid, existingAsset.uid, existingAsset.url);
    }
    return;
  }

  if (DRY_RUN) {
    console.log(`  🧪 DRY RUN: Would upload ${coverUrl}`);
    return;
  }

  try {
    // Download image
    console.log(`  ⬇️ Downloading image...`);
    const { buffer, contentType, filename } = await downloadImage(coverUrl);
    
    // Generate asset title
    const assetTitle = `manga-${manga.mal_id}-cover`;
    const assetFilename = `${assetTitle}${path.extname(filename) || '.jpg'}`;
    
    // Upload to Contentstack
    console.log(`  ⬆️ Uploading to Contentstack...`);
    const asset = await uploadAsset(
      buffer,
      assetFilename,
      contentType,
      assetTitle,
      `Cover image for ${manga.title}`
    );
    
    console.log(`  📦 Asset created: ${asset.uid}`);
    console.log(`  🌐 CDN URL: ${asset.url}`);
    
    // Update manga entry
    await updateMangaWithAsset(manga.uid, asset.uid, asset.url);
    
  } catch (error) {
    console.error(`  ❌ Failed to process: ${error.message}`);
  }
}

/**
 * Main function to process all manga
 */
async function processAllManga() {
  console.log("🖼️  Contentstack Manga Asset Upload Script");
  console.log("==========================================");
  console.log(`DRY RUN: ${DRY_RUN}\n`);

  try {
    // Fetch all manga entries
    const response = await csClient.get('/content_types/manga/entries', {
      params: { limit: 100 },
    });
    
    const mangaList = response.data.entries || [];
    console.log(`📊 Found ${mangaList.length} manga entries\n`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const manga of mangaList) {
      try {
        await processManga(manga);
        processed++;
        
        // Rate limiting - wait between uploads
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        failed++;
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log("\n==========================================");
    console.log("📊 Summary:");
    console.log(`  ✅ Processed: ${processed}`);
    console.log(`  ⏭ Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log("==========================================");
    
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
processAllManga();

export { downloadImage, uploadAsset, processManga };
