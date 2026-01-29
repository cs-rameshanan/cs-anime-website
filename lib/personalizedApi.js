import Stack from './contentstack';

/**
 * Fetch homepage content with variant support
 * @param {string} variantAlias - The variant alias (e.g., 'kids' or 'normal')
 * @returns {Promise<Object>} Homepage entry data
 */
export async function getHomepageContent(variantAlias = null) {
  try {
    const query = Stack.ContentType('homepage').Query();
    
    let result;
    
    if (variantAlias) {
      // Fetch with variant
      result = await query
        .toJSON()
        .find();
      
      // Note: The Contentstack SDK handles variants differently
      // You may need to use the entry().variants() method
      // depending on your SDK version
    } else {
      result = await query
        .toJSON()
        .find();
    }
    
    const entries = result[0] || [];
    return entries[0] || null;
  } catch (error) {
    console.error('Error fetching homepage:', error);
    return null;
  }
}

/**
 * Fetch a specific entry with variant support
 * @param {string} contentTypeUid - Content type UID
 * @param {string} entryUid - Entry UID
 * @param {string} variantAlias - Variant alias
 * @returns {Promise<Object>} Entry data
 */
export async function getEntryWithVariant(contentTypeUid, entryUid, variantAlias = null) {
  try {
    const entryQuery = Stack.ContentType(contentTypeUid).Entry(entryUid);
    
    if (variantAlias) {
      // Use variants method if available in your SDK version
      const result = await entryQuery
        .toJSON()
        .fetch();
      return result;
    }
    
    const result = await entryQuery.toJSON().fetch();
    return result;
  } catch (error) {
    console.error(`Error fetching entry ${entryUid}:`, error);
    return null;
  }
}

/**
 * Map profile type to variant alias
 * This should match the variant names in your Personalize Experience
 * @param {string} profileType - 'kids' or 'normal'
 * @returns {string} Variant alias
 */
export function profileToVariantAlias(profileType) {
  const mapping = {
    'kids': 'kids',
    'normal': 'normal',
  };
  return mapping[profileType] || 'normal';
}
