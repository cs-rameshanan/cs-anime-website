import { NextResponse } from 'next/server';

/**
 * Anime/Manga Chatbot API using Contentstack Brand Kit
 * 
 * This endpoint:
 * 1. Only answers anime/manga related questions
 * 2. Uses Brand Kit AI for on-brand responses
 * 3. Politely declines off-topic queries
 */

// Brand Kit configuration
const BRAND_KIT_CONFIG = {
  apiUrl: process.env.NEXT_PUBLIC_CONTENTSTACK_AI_API_URL || 'https://ai.contentstack.com/brand-kits',
  brandKitUid: process.env.CONTENTSTACK_BRAND_KIT_UID,
  authToken: process.env.CONTENTSTACK_AUTHTOKEN,
  apiKey: process.env.CONTENTSTACK_API_KEY,
  // Automation API for Brand Kit AI
  automationUrl: process.env.CONTENTSTACK_AUTOMATION_URL || 'https://app.contentstack.com/automations-api/run/2830aa21efac4ac9a78dc087c628ea35',
};

// Strict system prompt to limit responses to anime/manga only
const SYSTEM_PROMPT = `You are AniBot, the friendly AI assistant for AniVerse - an anime and manga platform.

STRICT RULES - YOU MUST FOLLOW THESE:
1. You ONLY answer questions about anime, manga, Japanese animation, and related topics
2. If someone asks about ANYTHING else (politics, coding, general knowledge, personal advice, etc.), politely decline and redirect to anime/manga topics
3. Be enthusiastic and use anime-related expressions occasionally (but don't overdo it!)
4. Keep responses concise (2-3 sentences for simple questions, up to a paragraph for complex ones)
5. You can recommend anime/manga based on preferences
6. You can explain anime terminology, genres, and tropes
7. You can discuss characters, plot, studios, and creators
8. Never generate harmful, inappropriate, or adult content
9. If unsure about specific anime facts, admit it rather than making things up

DECLINE TEMPLATE (use variations of this for off-topic questions):
"I'm AniBot, your anime and manga assistant! I can only help with anime and manga related questions. Want me to recommend something to watch, or do you have questions about a specific series?"

TOPICS YOU CAN DISCUSS:
- Anime series, movies, OVAs
- Manga, manhwa, manhua, light novels
- Characters, voice actors (seiyuu)
- Studios (like Studio Ghibli, MAPPA, Ufotable)
- Genres (shounen, shoujo, seinen, isekai, etc.)
- Anime/manga recommendations
- Plot discussions (with spoiler warnings)
- Anime culture and terminology
- Our AniVerse platform and its features

Remember: You represent AniVerse, so be helpful, friendly, and focused on anime/manga!`;

// Keywords to detect anime/manga related queries
const ANIME_KEYWORDS = [
  'anime', 'manga', 'watch', 'read', 'recommend', 'series', 'episode',
  'character', 'protagonist', 'villain', 'hero', 'studio', 'ghibli',
  'shounen', 'shoujo', 'seinen', 'josei', 'isekai', 'mecha', 'slice of life',
  'naruto', 'one piece', 'demon slayer', 'attack on titan', 'jujutsu',
  'dragon ball', 'bleach', 'death note', 'fullmetal', 'hunter', 'my hero',
  'tokyo ghoul', 'sword art', 'steins', 'code geass', 'evangelion',
  'cowboy bebop', 'spirited away', 'your name', 'akira', 'ghost in the shell',
  'berserk', 'vinland', 'chainsaw', 'spy x family', 'frieren',
  'opening', 'ending', 'ost', 'soundtrack', 'seiyuu', 'voice actor',
  'sub', 'dub', 'simulcast', 'crunchyroll', 'funimation',
  'otaku', 'waifu', 'husbando', 'best girl', 'best boy', 'aniverse',
  'genre', 'rating', 'review', 'season', 'arc', 'filler',
  'japanese', 'japan', 'animation', 'animated', 'cartoon',
  'manhwa', 'manhua', 'webtoon', 'light novel', 'visual novel',
];

// Check if query is anime/manga related
function isAnimeRelated(query) {
  const lowerQuery = query.toLowerCase();
  return ANIME_KEYWORDS.some(keyword => lowerQuery.includes(keyword));
}

// Call Contentstack Automation API for Brand Kit AI
async function callBrandKitAI(messages) {
  const { automationUrl } = BRAND_KIT_CONFIG;

  // Get the last user message
  const lastUserMessage = messages[messages.length - 1].content;
  
  // Check if anime related first
  if (!isAnimeRelated(lastUserMessage)) {
    return "I'm AniBot, your anime and manga assistant! I can only help with anime and manga related questions. Would you like me to recommend something to watch, or do you have questions about a specific series? 🎬";
  }
  
  // Build the full prompt with system context and conversation history
  const conversationContext = messages.slice(0, -1).map(m => 
    `${m.role === 'user' ? 'User' : 'AniBot'}: ${m.content}`
  ).join('\n');
  
  const fullPrompt = `${SYSTEM_PROMPT}

${conversationContext ? `Previous conversation:\n${conversationContext}\n\n` : ''}User: ${lastUserMessage}

Respond as AniBot:`;

  try {
    console.log('Calling Contentstack Automation API...');
    
    const response = await fetch(automationUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        query: lastUserMessage,
        user_message: lastUserMessage,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Automation API error:', response.status, errorText);
      return generateFallbackResponse(lastUserMessage);
    }

    // Get the raw text response first
    const responseText = await response.text();
    console.log('Automation API raw response:', responseText.substring(0, 300));
    
    // Try to parse as JSON, but if it fails, use the text directly
    let aiResponse;
    try {
      const data = JSON.parse(responseText);
      // Extract the response from JSON - try different possible structures
      aiResponse = data.response || data.content || data.message || data.text || data.result || data.output || data.answer;
      
      // If response is nested, try to extract it
      if (typeof aiResponse === 'object' && aiResponse !== null) {
        aiResponse = aiResponse.text || aiResponse.content || aiResponse.message || JSON.stringify(aiResponse);
      }
    } catch (parseError) {
      // Not JSON - the response is plain text, which is what we want!
      console.log('Response is plain text (not JSON)');
      aiResponse = responseText;
    }
    
    if (!aiResponse || aiResponse.trim() === '') {
      console.error('Empty response from API');
      return generateFallbackResponse(lastUserMessage);
    }
    
    return aiResponse.trim();
  } catch (error) {
    console.error('Error calling Automation API:', error);
    return generateFallbackResponse(lastUserMessage);
  }
}

// Fallback response when Brand Kit is not configured
function generateFallbackResponse(query) {
  const lowerQuery = query.toLowerCase();

  // Check if it's anime related
  if (!isAnimeRelated(query)) {
    return "I'm AniBot, your anime and manga assistant! I can only help with anime and manga related questions. Would you like me to recommend something to watch, or do you have questions about a specific series? 🎬";
  }

  // Simple fallback responses for common queries
  if (lowerQuery.includes('recommend') || lowerQuery.includes('suggest') || lowerQuery.includes('watch')) {
    return "Looking for recommendations? Here are some top picks: **Frieren: Beyond Journey's End** for fantasy adventure, **Chainsaw Man** for action, **Spy x Family** for comedy, or **Vinland Saga** for historical drama. What genre interests you most? 🌟";
  }

  if (lowerQuery.includes('best') && (lowerQuery.includes('anime') || lowerQuery.includes('manga'))) {
    return "That's a tough question! Some critically acclaimed titles include **Fullmetal Alchemist: Brotherhood**, **Steins;Gate**, **Attack on Titan**, and **Monster**. For manga, **Berserk**, **One Piece**, and **Vagabond** are legendary. It really depends on your preferred genre! 🏆";
  }

  if (lowerQuery.includes('genre')) {
    return "Anime has many genres! **Shounen** (action-packed stories), **Shoujo** (romance-focused), **Seinen** (mature themes), **Isekai** (transported to another world), **Slice of Life** (everyday moments), **Mecha** (giant robots), and many more. Which one sounds interesting to you? 📚";
  }

  if (lowerQuery.includes('aniverse') || lowerQuery.includes('website') || lowerQuery.includes('platform')) {
    return "Welcome to AniVerse! 🎉 We're your destination for discovering anime and collecting manga. You can browse our anime collection, shop for manga volumes, and find your next favorite series. Check out our featured titles on the homepage!";
  }

  // Generic anime response
  return "Great question about anime/manga! I'd love to help you explore the wonderful world of Japanese animation and comics. Could you be more specific about what you'd like to know? I can recommend series, explain genres, discuss characters, or help you find something to watch! 🎬";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Sanitize message (prevent prompt injection)
    const sanitizedMessage = message.slice(0, 500).trim();

    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Build conversation history
    const messages = [
      ...history.slice(-6), // Keep last 6 messages for context
      { role: 'user', content: sanitizedMessage },
    ];

    // Get response from Brand Kit AI
    const response = await callBrandKitAI(messages);

    return NextResponse.json({
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
