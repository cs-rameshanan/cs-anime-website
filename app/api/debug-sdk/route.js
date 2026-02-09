import { NextResponse } from 'next/server';
import Stack from '@/lib/contentstack';

export const dynamic = 'force-dynamic';

export async function GET() {
  const debug = {
    env: {
      CONTENTSTACK_API_KEY: process.env.CONTENTSTACK_API_KEY ? `${process.env.CONTENTSTACK_API_KEY.substring(0, 8)}...` : 'MISSING',
      CONTENTSTACK_DELIVERY_TOKEN: process.env.CONTENTSTACK_DELIVERY_TOKEN ? `${process.env.CONTENTSTACK_DELIVERY_TOKEN.substring(0, 8)}...` : 'MISSING',
      CONTENTSTACK_ENVIRONMENT: process.env.CONTENTSTACK_ENVIRONMENT || 'NOT SET',
      CONTENTSTACK_HOST: process.env.CONTENTSTACK_HOST || 'NOT SET',
      CONTENTSTACK_CDN: process.env.CONTENTSTACK_CDN || 'NOT SET',
      CONTENTSTACK_REGION: process.env.CONTENTSTACK_REGION || 'NOT SET',
      CONTENTSTACK_API_HOST: process.env.CONTENTSTACK_API_HOST || 'NOT SET',
    },
    sdk: {
      initialized: !!Stack,
    },
    tests: {},
  };

  // Test 1: Try to fetch anime count
  try {
    const query = Stack.ContentType('anime').Query();
    const result = await query.toJSON().find();
    const entries = result[0] || [];
    debug.tests.anime = {
      success: true,
      count: entries.length,
      firstTitle: entries[0]?.title || 'none',
    };
  } catch (error) {
    debug.tests.anime = {
      success: false,
      error: error.message,
      errorDetail: error.error_message || error.errors || null,
    };
  }

  // Test 2: Try to fetch genre count
  try {
    const query = Stack.ContentType('genre').Query();
    const result = await query.toJSON().find();
    const entries = result[0] || [];
    debug.tests.genre = {
      success: true,
      count: entries.length,
    };
  } catch (error) {
    debug.tests.genre = {
      success: false,
      error: error.message,
    };
  }

  return NextResponse.json(debug, { status: 200 });
}
