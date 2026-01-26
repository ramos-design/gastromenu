import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const n8nWebhookUrl = 'https://n8n.srv1004354.hstgr.cloud/webhook-test/d27670eb-ad4a-42ed-9b6f-acd4b00f78e6';

    try {
        const finalUrl = `${n8nWebhookUrl}?${searchParams.toString()}`;

        // Call n8n from the server to bypass CORS
        const response = await fetch(finalUrl, {
            method: 'GET',
        });

        if (!response.ok) {
            return NextResponse.json(
                { message: `n8n webhook error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error proxying to n8n:', error);
        return NextResponse.json(
            { message: 'Internal server error while calling webhook' },
            { status: 500 }
        );
    }
}
