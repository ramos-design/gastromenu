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

        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            // Handle n8n returning an array (common behavior)
            const responseData = Array.isArray(data) ? data[0] : data;
            return NextResponse.json(responseData);
        } else if (contentType && contentType.includes('image/')) {
            // Handle binary image response
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const base64Image = buffer.toString('base64');
            const dataUrl = `data:${contentType};base64,${base64Image}`;
            return NextResponse.json({ imageUrl: dataUrl });
        } else {
            // Fallback try JSON, or text
            try {
                const data = await response.json();
                const responseData = Array.isArray(data) ? data[0] : data;
                return NextResponse.json(responseData);
            } catch (e) {
                throw new Error(`Unexpected content type: ${contentType}`);
            }
        }
    } catch (error) {
        console.error('Error proxying to n8n:', error);
        return NextResponse.json(
            { message: 'Internal server error while calling webhook' },
            { status: 500 }
        );
    }
}
