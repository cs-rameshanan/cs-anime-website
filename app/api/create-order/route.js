import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, items, total } = body;

    // Check if environment variables are set
    if (!process.env.CONTENTSTACK_API_KEY) {
      console.error('Missing CONTENTSTACK_API_KEY');
      return NextResponse.json(
        { error: 'Server configuration error: Missing API Key' },
        { status: 500 }
      );
    }
    if (!process.env.CONTENTSTACK_MANAGEMENT_TOKEN) {
      console.error('Missing CONTENTSTACK_MANAGEMENT_TOKEN');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Management Token' },
        { status: 500 }
      );
    }

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Determine the API base URL based on region
    // Default is NA, change if your stack is in EU or Azure
    const apiBaseUrl = process.env.CONTENTSTACK_API_URL || 'https://dev22-app.csnonprod.com/api';

    // Create order entry in Contentstack
    const response = await fetch(
      `${apiBaseUrl}/v3/content_types/order/entries`,
      {
        method: 'POST',
        headers: {
          'api_key': process.env.CONTENTSTACK_API_KEY,
          'authorization': process.env.CONTENTSTACK_MANAGEMENT_TOKEN,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entry: {
            title: `Order ${orderId}`,
            order_id: orderId,
            customer_email: email,
            customer_name: name,
            items: JSON.stringify(items),
            total: total,
            status: 'pending',
          },
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Contentstack error:', JSON.stringify(responseData));
      return NextResponse.json(
        { 
          error: 'Failed to create order in Contentstack',
          details: responseData 
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      orderId: orderId,
      entryUid: responseData.entry.uid,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
