import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { messages, mode = 'normal' } = await request.json()

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    
    if (!OPENROUTER_API_KEY) {
      console.warn('OpenRouter API key not found, using fallback response')
      return NextResponse.json({
        content: getFallbackResponse(mode)
      })
    }

    // Create system prompt based on mode
    const systemPrompt = getSystemPrompt(mode)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Party On Delivery AI Concierge',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet', // Fast and high-quality model
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()
    const assistantMessage = data.choices[0]?.message?.content || 'Sorry, I had trouble processing that. How can I help you with your Austin party?'

    return NextResponse.json({
      content: assistantMessage
    })

  } catch (error) {
    console.error('Chat API error:', error)
    const { mode = 'normal' } = await request.json().catch(() => ({}))
    
    return NextResponse.json({
      content: getFallbackResponse(mode)
    })
  }
}

function getSystemPrompt(mode: string): string {
  const basePrompt = `You are the AI Concierge for Party On Delivery, Austin's premier alcohol delivery service. You help customers plan amazing parties and events.

Key Services:
- Fast alcohol delivery (30 minutes)
- Wedding bar service (premium packages $899-$4999)
- Boat party packages on Lake Travis ($399-$1599)
- Bachelor/bachelorette parties ($499-$2499)
- Corporate events ($1299+)

You serve Austin areas: Downtown, South Congress, Lake Travis, Westlake, Hyde Park, Rainey Street, 6th Street, The Domain, etc.

Company details:
- TABC licensed & fully insured
- Professional bartenders available
- Custom cocktail menus
- Setup/breakdown included
- Call: (512) 555-0123

Keep responses conversational, helpful, and under 100 words. Always suggest booking or calling for detailed quotes.`

  switch (mode) {
    case 'bachelor':
      return `${basePrompt}

BACHELOR MODE: You're talking to legends planning EPIC bachelor parties! Use energetic language with terms like "LEGENDARY," "EPIC," "wild nights," "unforgettable stories." Recommend our Bachelor packages ($499-$1299), mention 6th Street crawls, Lake Travis boat parties, and VIP experiences. Keep it fun and masculine but responsible.`

    case 'bachelorette':
      return `${basePrompt}

BACHELORETTE MODE: You're talking to QUEENS planning fabulous celebrations! Use glamorous language with terms like "Queen," "fabulous," "royal treatment," "champagne dreams," "Instagram-worthy." Recommend our Bachelorette packages ($699-$1599), mention spa day deliveries, pink cocktails, and luxury experiences. Keep it elegant and fun!`

    case 'party':
      return `${basePrompt}

PARTY MODE: Maximum energy! Use exciting language, lots of emojis, and emphasize fun. Talk about turning celebrations "up to 11," creating "legendary nights," and "unforgettable experiences." Be enthusiastic about all our services!`

    case 'elegant':
      return `${basePrompt}

ELEGANT MODE: Sophisticated and refined tone. Focus on premium experiences, luxury service, and elegant celebrations. Emphasize our high-end wedding packages, corporate events, and refined service standards.`

    default:
      return basePrompt
  }
}

function getFallbackResponse(mode: string): string {
  const responses = {
    bachelor: [
      "LEGEND! I'd love to help you plan an EPIC bachelor party! Our packages start at $499 for the ultimate Austin experience. Call (512) 555-0123 to book your legendary night!",
      "Ready to make some WILD memories? Our bachelor packages include 6th Street guides, Lake Travis boat parties, and VIP treatment. Let's plan something LEGENDARY!",
      "EPIC choice coming to Party On! We've got everything from pre-game supplies to full VIP service. Book at partyondelivery.com or call (512) 555-0123!"
    ],
    bachelorette: [
      "Hey Queen! I'm here to help plan your FABULOUS bachelorette party! Our royal packages start at $699 with champagne, pink cocktails, and Instagram-worthy setups. Call (512) 555-0123!",
      "Ready for some Queen treatment? We do spa day deliveries, luxury boat parties, and everything fit for Austin royalty. Let's make your celebration ROYAL!",
      "Fabulous choice! Our bachelorette packages include everything from mimosa brunches to royal treatment. Book your queen experience today!"
    ],
    party: [
      "PARTY TIME! Let's turn your celebration UP TO 11! We deliver anywhere in Austin in 30 minutes. Call (512) 555-0123 or book online!",
      "Ready to PARTY? We've got Lake Travis boat parties, 6th Street packages, and everything in between! What's your vibe?",
      "Let's make this LEGENDARY! From weddings to wild nights, we bring the party to you across Austin!"
    ],
    default: [
      "Hey there! I'd love to help plan your Austin celebration! We offer fast delivery, wedding services, boat parties, and more. Call (512) 555-0123 or book online!",
      "Perfect timing! We deliver premium alcohol across Austin in 30 minutes, plus full event services. What kind of celebration are you planning?",
      "Great choice with Party On! From Lake Travis to downtown, we bring the party to you. Wedding? Bachelor party? Just tell me what you're thinking!"
    ]
  }

  const modeResponses = responses[mode as keyof typeof responses] || responses.default
  return modeResponses[Math.floor(Math.random() * modeResponses.length)]
}