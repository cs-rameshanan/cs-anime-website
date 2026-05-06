import "dotenv/config";
import { csClient } from "./csClient.js";

/**
 * 🚀 Contentstack DXP Bootstrap Script
 * 
 * Creates EVERYTHING needed in Contentstack from scratch:
 * 1. Content Types (genre, anime, manga, episode, daily_update, order)
 * 2. Environment (development)
 * 3. Delivery Token
 * 
 * After running this, you just need to:
 * - npm start           → Import anime + genres + episodes
 * - npm run import-manga → Import manga
 * - npm run upload-assets → Upload anime images to CDN
 * - npm run upload-manga-assets → Upload manga images to CDN
 * - npm run publish      → Publish all entries
 */

const DELAY = 1500; // ms between API calls to avoid rate limits
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ================================================
// CONTENT TYPE DEFINITIONS
// ================================================

const CONTENT_TYPES = {
  genre: {
    content_type: {
      title: "Genre",
      uid: "genre",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          unique: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Slug",
          uid: "slug",
          data_type: "text",
          unique: true,
          field_metadata: { description: "URL-friendly identifier" },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
        url_pattern: "/:slug",
      },
    },
  },

  anime: {
    content_type: {
      title: "Anime",
      uid: "anime",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Slug",
          uid: "slug",
          data_type: "text",
          unique: true,
          field_metadata: { description: "URL-friendly identifier" },
        },
        {
          display_name: "Description",
          uid: "description",
          data_type: "text",
          field_metadata: { multiline: true, description: "Anime synopsis" },
        },
        {
          display_name: "Rating",
          uid: "rating",
          data_type: "number",
          field_metadata: { description: "Rating score (e.g. 8.5)" },
        },
        {
          display_name: "Release Year",
          uid: "release_year",
          data_type: "number",
          field_metadata: { description: "Year of release" },
        },
        {
          display_name: "Status",
          uid: "status",
          data_type: "text",
          field_metadata: { description: "Airing status (e.g. Finished Airing, Currently Airing)" },
        },
        {
          display_name: "Poster URL",
          uid: "poster_url",
          data_type: "text",
          field_metadata: { description: "Poster image URL (Contentstack CDN or external)" },
        },
        {
          display_name: "MAL ID",
          uid: "mal_id",
          data_type: "number",
          unique: true,
          field_metadata: { description: "MyAnimeList unique identifier" },
        },
        {
          display_name: "Genres",
          uid: "genres",
          data_type: "reference",
          reference_to: ["genre"],
          multiple: true,
          field_metadata: { description: "Associated genres" },
        },
        {
          display_name: "Audience Tag",
          uid: "audience_tag",
          data_type: "text",
          display_type: "dropdown",
          enum: {
            advanced: false,
            choices: [
              { value: "all" },
              { value: "kids" },
              { value: "normal" },
            ],
          },
          field_metadata: {
            description: "Target audience: 'all' (show everywhere), 'kids' (kids only), 'normal' (adults only). Defaults to genre-based filtering if empty.",
          },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
        url_pattern: "/:slug",
      },
    },
  },

  manga: {
    content_type: {
      title: "Manga",
      uid: "manga",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Slug",
          uid: "slug",
          data_type: "text",
          unique: true,
          field_metadata: { description: "URL-friendly identifier" },
        },
        {
          display_name: "Synopsis",
          uid: "synopsis",
          data_type: "text",
          field_metadata: { multiline: true, description: "Manga synopsis" },
        },
        {
          display_name: "Cover Image",
          uid: "cover_image",
          data_type: "text",
          field_metadata: { description: "Cover image URL (Contentstack CDN or external)" },
        },
        {
          display_name: "Price",
          uid: "price",
          data_type: "number",
          field_metadata: { description: "Price in USD" },
        },
        {
          display_name: "Author",
          uid: "author",
          data_type: "text",
          field_metadata: { description: "Author name" },
        },
        {
          display_name: "Volumes",
          uid: "volumes",
          data_type: "number",
          field_metadata: { description: "Number of volumes" },
        },
        {
          display_name: "Status",
          uid: "status",
          data_type: "text",
          field_metadata: { description: "Publishing status" },
        },
        {
          display_name: "MAL ID",
          uid: "mal_id",
          data_type: "number",
          unique: true,
          field_metadata: { description: "MyAnimeList unique identifier" },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
        url_pattern: "/:slug",
      },
    },
  },

  episode: {
    content_type: {
      title: "Episode",
      uid: "episode",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Slug",
          uid: "slug",
          data_type: "text",
          unique: true,
          field_metadata: { description: "URL-friendly identifier" },
        },
        {
          display_name: "Episode Number",
          uid: "episode_number",
          data_type: "number",
          field_metadata: { description: "Episode number within the anime" },
        },
        {
          display_name: "Synopsis",
          uid: "synopsis",
          data_type: "text",
          field_metadata: { multiline: true, description: "Episode synopsis" },
        },
        {
          display_name: "Air Date",
          uid: "air_date",
          data_type: "isodate",
          field_metadata: { description: "Original air date" },
        },
        {
          display_name: "MAL ID",
          uid: "mal_id",
          data_type: "number",
          field_metadata: { description: "Episode MAL ID (unique per anime)" },
        },
        {
          display_name: "Anime MAL ID",
          uid: "anime_mal_id",
          data_type: "number",
          field_metadata: { description: "Parent anime MAL ID" },
        },
        {
          display_name: "Anime Reference",
          uid: "anime_reference",
          data_type: "reference",
          reference_to: ["anime"],
          multiple: false,
          field_metadata: { description: "Reference to parent anime" },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
        url_pattern: "/:slug",
      },
    },
  },

  daily_update: {
    content_type: {
      title: "Daily Update",
      uid: "daily_update",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          unique: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Date",
          uid: "date",
          data_type: "isodate",
          field_metadata: { description: "Date of the update" },
        },
        {
          display_name: "Episodes",
          uid: "episodes",
          data_type: "text",
          field_metadata: {
            multiline: true,
            description: "JSON string of recently updated episodes",
          },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
      },
    },
  },

  homepage: {
    content_type: {
      title: "Homepage",
      uid: "homepage",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Hero Title Line 1",
          uid: "hero_title_line1",
          data_type: "text",
          field_metadata: { description: "First line of hero heading (e.g. 'Discover Your')" },
        },
        {
          display_name: "Hero Title Line 2",
          uid: "hero_title_line2",
          data_type: "text",
          field_metadata: { description: "Second line of hero heading (e.g. 'Next Anime')" },
        },
        {
          display_name: "Hero Subtitle",
          uid: "hero_subtitle",
          data_type: "text",
          field_metadata: { multiline: true, description: "Hero section subtitle text" },
        },
        {
          display_name: "Primary Button Text",
          uid: "primary_button_text",
          data_type: "text",
          field_metadata: { description: "Primary CTA button text" },
        },
        {
          display_name: "Primary Button Link",
          uid: "primary_button_link",
          data_type: "text",
          field_metadata: { description: "Primary CTA button URL" },
        },
        {
          display_name: "Secondary Button Text",
          uid: "secondary_button_text",
          data_type: "text",
          field_metadata: { description: "Secondary button text" },
        },
        {
          display_name: "Secondary Button Link",
          uid: "secondary_button_link",
          data_type: "text",
          field_metadata: { description: "Secondary button URL" },
        },
        {
          display_name: "Featured Section Title",
          uid: "featured_section_title",
          data_type: "text",
          field_metadata: { description: "Title for the featured anime section" },
        },
        {
          display_name: "Featured Section Subtitle",
          uid: "featured_section_subtitle",
          data_type: "text",
          field_metadata: { description: "Subtitle for the featured anime section" },
        },
        {
          display_name: "Featured Anime",
          uid: "featured_anime",
          data_type: "reference",
          reference_to: ["anime"],
          multiple: true,
          field_metadata: { description: "Curated list of featured anime to display" },
        },
        {
          display_name: "CTA Title",
          uid: "cta_title",
          data_type: "text",
          field_metadata: { description: "Call-to-action section title" },
        },
        {
          display_name: "CTA Description",
          uid: "cta_description",
          data_type: "text",
          field_metadata: { multiline: true, description: "Call-to-action description text" },
        },
        {
          display_name: "CTA Button Text",
          uid: "cta_button_text",
          data_type: "text",
          field_metadata: { description: "Call-to-action button text" },
        },
        {
          display_name: "CTA Button Link",
          uid: "cta_button_link",
          data_type: "text",
          field_metadata: { description: "Call-to-action button URL" },
        },
        {
          display_name: "Theme Gradient",
          uid: "theme_gradient",
          data_type: "text",
          field_metadata: { description: "Tailwind gradient class (e.g. 'from-aurora to-stardust')" },
        },
        {
          display_name: "URL",
          uid: "url",
          data_type: "text",
          field_metadata: { _default: true, description: "Page URL" },
        },
      ],
      options: {
        is_page: true,
        singleton: true,
        title: "title",
        url_pattern: "/:title",
        url_prefix: "/",
      },
    },
  },

  order: {
    content_type: {
      title: "Order",
      uid: "order",
      schema: [
        {
          display_name: "Title",
          uid: "title",
          data_type: "text",
          mandatory: true,
          field_metadata: { _default: true },
        },
        {
          display_name: "Order ID",
          uid: "order_id",
          data_type: "text",
          unique: true,
          field_metadata: { description: "Unique order identifier" },
        },
        {
          display_name: "Customer Name",
          uid: "customer_name",
          data_type: "text",
          field_metadata: { description: "Customer's full name" },
        },
        {
          display_name: "Customer Email",
          uid: "customer_email",
          data_type: "text",
          field_metadata: { description: "Customer's email address" },
        },
        {
          display_name: "Items",
          uid: "items",
          data_type: "text",
          field_metadata: {
            multiline: true,
            description: "JSON string of cart items",
          },
        },
        {
          display_name: "Total",
          uid: "total",
          data_type: "number",
          field_metadata: { description: "Order total in USD" },
        },
        {
          display_name: "Status",
          uid: "status",
          data_type: "text",
          field_metadata: { description: "Order status (pending, confirmed, shipped, delivered)" },
        },
      ],
      options: {
        is_page: false,
        singleton: false,
        title: "title",
      },
    },
  },
};

// ================================================
// HELPER FUNCTIONS
// ================================================

async function contentTypeExists(uid) {
  try {
    const res = await csClient.get(`/content_types/${uid}`);
    return true;
  } catch (error) {
    // 404 or 422 means it doesn't exist
    if (error.response?.status === 404 || error.response?.status === 422) return false;
    console.error(`  ⚠️  Error checking content type '${uid}':`, error.response?.data?.error_message || error.message);
    return false; // Assume doesn't exist and try to create
  }
}

async function environmentExists(name) {
  try {
    const res = await csClient.get("/environments");
    const environments = res.data.environments || [];
    return environments.some((env) => env.name === name);
  } catch (error) {
    return false;
  }
}

async function deliveryTokenExists() {
  try {
    const res = await csClient.get("/stacks/delivery_tokens");
    const tokens = res.data.delivery_tokens || [];
    return tokens.length > 0 ? tokens[0] : null;
  } catch (error) {
    return null;
  }
}

// ================================================
// CREATION FUNCTIONS
// ================================================

async function createContentType(uid, definition) {
  if (await contentTypeExists(uid)) {
    console.log(`  ⏭ Content type '${uid}' already exists, skipping`);
    return;
  }

  try {
    await csClient.post("/content_types", definition);
    console.log(`  ✅ Content type '${uid}' created successfully`);
  } catch (error) {
    console.error(`  ❌ Failed to create '${uid}':`, error.response?.data?.error_message || error.message);
    
    // If it's a validation error, log the details
    if (error.response?.data?.errors) {
      console.error("    Details:", JSON.stringify(error.response.data.errors, null, 2));
    }
  }
}

async function updateContentType(uid, newFields) {
  try {
    // Fetch current schema
    const res = await csClient.get(`/content_types/${uid}`);
    const contentType = res.data.content_type;
    
    // Check which fields already exist
    const existingFieldUids = contentType.schema.map(f => f.uid);
    const fieldsToAdd = newFields.filter(f => !existingFieldUids.includes(f.uid));
    
    if (fieldsToAdd.length === 0) {
      console.log(`  ⏭ Content type '${uid}' already has all fields`);
      return;
    }

    // Add new fields to schema
    contentType.schema.push(...fieldsToAdd);

    await csClient.put(`/content_types/${uid}`, {
      content_type: {
        title: contentType.title,
        uid: contentType.uid,
        schema: contentType.schema,
        options: contentType.options,
      },
    });
    
    console.log(`  ✅ Updated '${uid}' with fields: ${fieldsToAdd.map(f => f.uid).join(', ')}`);
  } catch (error) {
    console.error(`  ❌ Failed to update '${uid}':`, error.response?.data?.error_message || error.message);
    if (error.response?.data?.errors) {
      console.error("    Details:", JSON.stringify(error.response.data.errors, null, 2));
    }
  }
}

async function createEnvironment() {
  const envName = process.env.CONTENTSTACK_ENVIRONMENT || "development";

  if (await environmentExists(envName)) {
    console.log(`  ⏭ Environment '${envName}' already exists`);
    return;
  }

  try {
    await csClient.post("/environments", {
      environment: {
        name: envName,
        urls: [
          {
            locale: "en-us",
            url: "http://localhost:3000",
          },
        ],
      },
    });
    console.log(`  ✅ Environment '${envName}' created successfully`);
  } catch (error) {
    console.error(`  ❌ Failed to create environment:`, error.response?.data?.error_message || error.message);
  }
}

// ================================================
// MAIN BOOTSTRAP FUNCTION
// ================================================

async function bootstrap() {
  console.log("🚀 Contentstack DXP Bootstrap");
  console.log("==============================");
  console.log(`API Key: ${process.env.CONTENTSTACK_API_KEY}`);
  console.log("");

  // Step 1: Create Environment
  console.log("📦 Step 1: Creating Environment");
  console.log("─────────────────────────────────");
  await createEnvironment();
  await wait(DELAY);

  // Step 2: Create Content Types (order matters - genre first, then anime, then episode)
  console.log("\n📋 Step 2: Creating Content Types");
  console.log("─────────────────────────────────");

  const orderedTypes = ["genre", "anime", "manga", "episode", "daily_update", "homepage", "order"];

  for (const typeUid of orderedTypes) {
    await createContentType(typeUid, CONTENT_TYPES[typeUid]);
    await wait(DELAY);
  }

  // Step 2b: Update existing content types with new fields
  console.log("\n🔄 Step 2b: Updating Existing Content Types");
  console.log("─────────────────────────────────────────────");
  
  await updateContentType("anime", [
    {
      display_name: "Audience Tag",
      uid: "audience_tag",
      data_type: "text",
      display_type: "dropdown",
      enum: {
        advanced: false,
        choices: [
          { value: "all" },
          { value: "kids" },
          { value: "normal" },
        ],
      },
      field_metadata: {
        description: "Target audience: 'all' (show everywhere), 'kids' (kids only), 'normal' (adults only)",
      },
    },
  ]);
  await wait(DELAY);

  // Step 3: Summary
  console.log("\n==============================");
  console.log("📊 Bootstrap Summary");
  console.log("==============================");
  const envName = process.env.CONTENTSTACK_ENVIRONMENT || "development";
  console.log(`✅ Environment: ${envName}`);
  console.log("✅ Content Types: genre, anime, manga, episode, daily_update, homepage, order");
  
  console.log("\n📋 Next Steps:");
  console.log("─────────────────────────────────");
  console.log("1. Run: npm start                  → Import anime + genres + episodes");
  console.log("2. Run: npm run import-manga        → Import manga");
  console.log("3. Run: npm run upload-assets        → Upload anime posters to CDN");
  console.log("4. Run: npm run upload-manga-assets   → Upload manga covers to CDN");
  console.log("5. Run: npm run publish              → Publish all entries");
  console.log("6. Run: npm run daily-update          → Create today's daily update");
  console.log("");
  console.log("📌 Manual Setup Required in Contentstack UI:");
  console.log("─────────────────────────────────");
  console.log("• Personalize → Create project in UI, then: npm run setup-personalize");
  console.log("• Brand Kit   → npm run setup-brand-kit (or create in UI)");
  console.log("• Automation  → Create automation workflow for chatbot");
  console.log(`• Delivery Token → Create one for the '${envName}' environment`);
  console.log("");
  console.log("🎉 Bootstrap complete!");
}

bootstrap().catch((err) => {
  console.error("💥 Bootstrap failed:", err.message);
  process.exit(1);
});
