import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { scrapeLimiter, getClientIp } from '../../../lib/ratelimit';
import { generatePitchSchema } from '../../../lib/validation';

// Make sure to export a POST handler for Next.js App Router API
export async function POST(req: Request) {
  try {
    // SECURITY: Rate limiting (scrapeLimiter — 3/min per IP).
    // Each call hits the OpenAI API which costs money per token, so we use
    // the strictest tier to prevent bill-padding by a malicious or buggy client.
    const ip = getClientIp(req);
    const { success } = await scrapeLimiter.limit(ip);
    if (!success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // SECURITY: Input validation via Zod (generatePitchSchema).
    // .passthrough() preserves any extra lead fields the prompt template
    // doesn't reference; the explicitly listed fields are length-capped to
    // bound prompt size (and therefore OpenAI cost + injection blast radius).
    const rawBody = await req.json();
    const parsed = generatePitchSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const lead = parsed.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key missing in environment variables.' },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Domain extraction for cleaner prompt logic
    let domain = '';
    try {
      if (lead.website) {
        domain = new URL(lead.website).hostname.replace('www.', '');
      }
    } catch (e) {
      domain = lead.website || 'your website';
    }

    const prompt = `
You are a freelance web designer writing a completely natural, human-sounding cold email pitch to a local business called ${lead.name}.

Here is the tech data you scraped about their website (${domain}):
- Load Time (LCP): ${lead.load_time ? lead.load_time + ' seconds' : 'Unknown'}
- Mobile Friendly: ${lead.mobile_friendly ? 'Yes' : 'No'}
- CMS Used: ${lead.cms_type || 'Unknown'}
- Direct Booking System: ${lead.has_booking ? 'Yes' : 'No'}
- Rating: ${lead.rating || 'Unknown'}

RULES:
1. Write extremely naturally. Do NOT use corporate speak like "Dear Sir/Madam", "I hope this email finds you well", or "Unlock your potential".
2. Sound like a knowledgeable local developer who just happened to notice a few technical issues while browsing their site on their phone.
3. Bring up AT MOST 2 of the negative technical points (e.g. if load time is > 3, mention it's slow. If mobile friendly is No, mention it's broken on phones). If their tech looks fine, just pitch a generic design refresh.
4. Conclude by asking if they are open to a quick chat this week.
5. Leave a placeholder like '[Your Name]' at the bottom.
6. The email should be no longer than 4 short paragraphs.
    `;

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 300,
    });

    const generatedPitch = completion.choices[0].message.content?.trim() || '';

    return NextResponse.json({ pitch: generatedPitch });
    
  } catch (error: any) {
    console.error('Error in /api/generate-pitch:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to generate pitch.' },
      { status: 500 }
    );
  }
}
