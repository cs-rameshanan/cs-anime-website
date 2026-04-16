import "dotenv/config";
import axios from "axios";
import FormData from "form-data";
import { csClient } from "./csClient.js";
import path from "path";

/**
 * Contentstack Asset Upload Script
 * 
 * This script:
 * 1. Fetches all anime entries with external poster URLs
 * 2. Downloads images from external URLs
 * 3. Uploads them to Contentstack as assets
 * 4. Updates anime entries to use Contentstack CDN URLs
 */

const DRY_RUN = process.env.DRY_RUN === "true";
const ASSET_FOLDER_UID = process.env.CONTENTSTACK_ASSET_FOLDER_UID || null;

/**
 * Download image from URL and return as buffer
 * @param {string} imageUrl - External image URL
 * @returns {Promise<{buffer: Buffer, contentType: string, filename: string}>}
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

    // Extract filename from URL
    const urlPath = new URL(imageUrl).pathname;
    let filename = path.basename(urlPath) || 'image.jpg';
    
    // Ensure filename has extension
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
 * @param {Buffer} buffer - Image buffer
 * @param {string} filename - Filename for the asset
 * @param {string} contentType - MIME type
 * @param {string} title - Asset title
 * @param {string} description - Asset description
 * @returns {Promise<Object>} Uploaded asset data
 */
async function uploadAsset(buffer, filename, contentType, title, description = "") {
  const form = new FormData();
  
  // Add the file
  form.append('asset[upload]', buffer, {
    filename,
    contentType,
  });
  
  // Add metadata
  form.append('asset[title]', title);
  form.append('asset[description]', description);
  
  // Add to folder if specified
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
 * Check if an asset already exists for this anime
 * @param {string} malId - MyAnimeList ID
 * @returns {Promise<Object|null>} Existing asset or null
 */
async function findExistingAsset(malId) {
  try {
    const response = await csClient.get(`/assets`, {
      params: {
        query: JSON.stringify({ title: { $regex: `anime-${malId}-` } }),
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
 * Update anime entry with new asset UID
 * @param {string} entryUid - Entry UID
 * @param {string} assetUid - Asset UID
 * @param {string} assetUrl - Asset CDN URL
 */
async function updateAnimeWithAsset(entryUid, assetUid, assetUrl) {
  try {
    await csClient.put(`/content_types/anime/entries/${entryUid}`, {
      entry: {
        poster_asset: assetUid,  // If you have a file field
        poster_url: assetUrl,     // Keep URL for backward compatibility
      },
    });
    console.log(`  ✅ Updated anime entry with CDN asset`);
  } catch (error) {
    console.error(`  ❌ Failed to update anime:`, error.response?.data || error.message);
  }
}

/**
 * Process a single anime entry
 * @param {Object} anime - Anime entry object
 */
async function processAnime(anime) {
  console.log(`\n📺 Processing: ${anime.title}`);
  
  const posterUrl = anime.poster_url;
  
  if (!posterUrl) {
    console.log(`  ⏭ No poster URL, skipping`);
    return;
  }

  // Check if already using Contentstack CDN
  if (posterUrl.includes('contentstack.io') || posterUrl.includes('contentstack.com')) {
    console.log(`  ⏭ Already using Contentstack CDN`);
    return;
  }

  // Check for existing asset
  const existingAsset = await findExistingAsset(anime.mal_id);
  if (existingAsset) {
    console.log(`  ⏭ Asset already exists, updating entry...`);
    if (!DRY_RUN) {
      await updateAnimeWithAsset(anime.uid, existingAsset.uid, existingAsset.url);
    }
    return;
  }

  if (DRY_RUN) {
    console.log(`  🧪 DRY RUN: Would upload ${posterUrl}`);
    return;
  }

  try {
    // Download image
    console.log(`  ⬇️ Downloading image...`);
    const { buffer, contentType, filename } = await downloadImage(posterUrl);
    
    // Generate asset title
    const assetTitle = `anime-${anime.mal_id}-poster`;
    const assetFilename = `${assetTitle}${path.extname(filename) || '.jpg'}`;
    
    // Upload to Contentstack
    console.log(`  ⬆️ Uploading to Contentstack...`);
    const asset = await uploadAsset(
      buffer,
      assetFilename,
      contentType,
      assetTitle,
      `Poster image for ${anime.title}`
    );
    
    console.log(`  📦 Asset created: ${asset.uid}`);
    console.log(`  🌐 CDN URL: ${asset.url}`);
    
    // Update anime entry
    await updateAnimeWithAsset(anime.uid, asset.uid, asset.url);
    
  } catch (error) {
    console.error(`  ❌ Failed to process: ${error.message}`);
  }
}

/**
 * Main function to process all anime
 */
async function processAllAnime() {
  console.log("🖼️  Contentstack Asset Upload Script");
  console.log("====================================");
  console.log(`DRY RUN: ${DRY_RUN}\n`);

  try {
    // Fetch all anime entries
    const response = await csClient.get('/content_types/anime/entries', {
      params: { limit: 100 },
    });
    
    const animeList = response.data.entries || [];
    console.log(`📊 Found ${animeList.length} anime entries\n`);

    let processed = 0;
    let skipped = 0;
    let failed = 0;

    for (const anime of animeList) {
      try {
        await processAnime(anime);
        processed++;
        
        // Rate limiting - wait between uploads
        await new Promise(r => setTimeout(r, 1000));
      } catch (error) {
        failed++;
        console.error(`  ❌ Error: ${error.message}`);
      }
    }

    console.log("\n====================================");
    console.log("📊 Summary:");
    console.log(`  ✅ Processed: ${processed}`);
    console.log(`  ⏭ Skipped: ${skipped}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log("====================================");
    
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

// Run if called directly
processAllAnime();

export { downloadImage, uploadAsset, processAnime };
