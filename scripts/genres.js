import slugify from "slugify";
import { csClient } from "./csClient.js";

export async function getOrCreateGenre(name) {
  const slug = slugify(name, { lower: true });

  // Query by title since that's what needs to be unique
  const res = await csClient.get(
    `/content_types/genre/entries?query={"title":"${name}"}`
  );

  if (res.data.entries.length > 0) {
    return res.data.entries[0].uid;
  }

  try {
    const created = await csClient.post("/content_types/genre/entries", {
      entry: {
        title: name,
        slug,
      },
    });
    return created.data.entry.uid;
  } catch (error) {
    // Handle race condition: if entry was created between our check and create
    if (error.response?.status === 422 && error.response?.data?.errors?.title) {
      const retry = await csClient.get(
        `/content_types/genre/entries?query={"title":"${name}"}`
      );
      if (retry.data.entries.length > 0) {
        return retry.data.entries[0].uid;
      }
    }
    throw error;
  }
}
