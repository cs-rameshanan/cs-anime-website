import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, items, total } = body;

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create order entry in Contentstack
    const response = await fetch(
      'https://api.contentstack.io/v3/content_types/order/entries',
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

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Contentstack error:', errorData);
      throw new Error('Failed to create order in Contentstack');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      orderId: orderId,
      entryUid: data.entry.uid,
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

