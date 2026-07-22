import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Cache the prompt content to avoid reading file on every request
let cachedBasePrompt: string | null = null

async function loadBasePrompt(): Promise<string> {
  if (cachedBasePrompt) {
    return cachedBasePrompt
  }

  try {
    const promptPath = join(process.cwd(), 'src', 'prompts', 'reginald.md')
    const content = await readFile(promptPath, 'utf-8')

    // Extract just the content we need (everything before mode-specific behaviors)
    const modeSpecificIndex = content.indexOf('## Mode-Specific Behaviors')
    const baseContent = modeSpecificIndex > 0 ? content.substring(0, modeSpecificIndex) : content

    cachedBasePrompt = baseContent.trim()
    return cachedBasePrompt
  } catch (error) {
    console.error('Failed to load Wayne prompt from markdown:', error)
    // Fallback to inline prompt if file cannot be read
    return getFallbackBasePrompt()
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages, mode = 'normal' } = await request.json()

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
    
    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not found in environment variables')
      return NextResponse.json({
        content: getFallbackResponse(mode)
      })
    }
    
    console.log('Using OpenRouter API with key:', OPENROUTER_API_KEY.substring(0, 10) + '...')

    // Load base prompt from markdown and create system prompt based on mode
    const basePrompt = await loadBasePrompt()
    const systemPrompt = getSystemPrompt(mode, basePrompt)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://partyondelivery.com',
        'X-Title': 'Party On Delivery AI Concierge',
      },
      body: JSON.stringify({
        // claude-3.5-sonnet-20241022 was removed from OpenRouter (404 → every chat
        // silently served the canned fallback). Keep in sync with scripts/playbook/replay-golden-set.ts.
        model: 'anthropic/claude-sonnet-5',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        // 0.3: a factual concierge — playbook facts + escalation discipline matter
        // more than creative variance (golden-set replay is calibrated to this).
        temperature: 0.3,
        max_tokens: 500,
        // Some providers (Amazon Bedrock) default Sonnet 5 to extended thinking, which
        // eats the whole max_tokens budget → empty content → the canned fallback ships.
        reasoning: { enabled: false },
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenRouter API error:', response.status, errorData)
      throw new Error(`OpenRouter API error: ${response.status} - ${errorData}`)
    }

    const data = await response.json()
    console.log('OpenRouter response:', JSON.stringify(data).substring(0, 200))
    
    const assistantMessage = data.choices?.[0]?.message?.content || data.error?.message || 'Sorry, I had trouble processing that. How can I help you with your Austin party?'

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

function getSystemPrompt(mode: string, basePrompt: string): string {
  switch (mode) {
    case 'bachelor':
      return `${basePrompt}

### Bachelor Party Mode Active

Last celebration before the big day. Suggest crowd-pleasers — good whiskey, Ranch Water, and plenty of cold beer — and mention our Lake Travis boat packages if it fits. Keep it fun but short, and get to the recommendation.

(The Playbook Priority Rules above override this mode guidance for service questions, escalations, and facts.)`

    case 'bachelorette':
      return `${basePrompt}

### Bachelorette Mode Active

Set the group up well: bubbly (Dom Pérignon, Veuve Clicquot), rosé, or hard seltzers if that's more their speed — our packages photograph as well as they taste. Keep it warm and brief.

(The Playbook Priority Rules above override this mode guidance for service questions, escalations, and facts.)`

    case 'event-planning':
      return `${basePrompt}

### Event Planning Mode Active

Weddings, corporate events, and formal parties. Start from the curated per-person bar packages above and size them to the guest count. Keep it clear and professional.

(The Playbook Priority Rules above override this mode guidance for service questions, escalations, and facts.)`

    default:
      return `${basePrompt}

### Standard Service Mode Active

Welcome them to Party On Delivery and help them put together the right drinks for their event — a small gathering or a big celebration. Lead with what they need; keep replies short and genuinely friendly.

(The Playbook Priority Rules above override this mode guidance for service questions, escalations, and facts.)`
  }
}

function getFallbackBasePrompt(): string {
  return `You are WAYNE, Party On Delivery's Texas Party Pro - a friendly, relaxed Austin-born expert who's planned thousands of celebrations across the Lone Star State.

Your personality:
- You speak with friendly, relaxed Austin-born Texas charm
- Warm, hospitable, confident, and lightly humorous
- Use medium-level Texas flavor (20-30% of messages)
- Texas phrases: "This ain't our first rodeo", "Y'all are in good hands", "Let's rustle up the right drinks"
- Occasionally use "Alright, alright, alright" like a friendly McConaughey nod
- Keep responses under 50 words - be VERY concise

Party On Delivery services:
- Premium alcohol delivery
- Wedding bar service
- Lake Travis boat parties
- Bachelor/ette celebrations
- Corporate events

Always suggest specific products. Direct them to browse our catalog or order online.

Use [PRODUCTS: item1, item2] or [PACKAGE: "Name"] format for recommendations.`
}

function getFallbackResponse(mode: string): string {
  const responses = {
    bachelor: [
      "Alright, alright, alright - bachelor party time! Let me rustle up the perfect setup for y'all. Lake Travis yacht packages are where it's at. We got Macallan 18 for sippin' and Ranch Water to keep it local. Check out PartyOnDelivery.com! [PRODUCTS: Macallan 18 Year, Ranch Water Variety Pack, Tito's Vodka]",
      "Last ride before the big day! This ain't our first rodeo, partner. We'll set y'all up with premium spirits and everything you need. Visit PartyOnDelivery.com to order. [PRODUCTS: Johnnie Walker Blue, Don Julio 1942, Corona Beer 12-Pack]"
    ],
    bachelorette: [
      "Well now, let's get the bride-to-be set up right! We got the bubbly, the rosé, and all those Instagram-worthy setups y'all love. Dom Pérignon for toasts and some refreshing options too. Y'all are gonna love it! [PRODUCTS: Dom Perignon, Whispering Angel Rose, Tito's Vodka]",
      "Bride celebration? We'll make it unforgettable! Our packages look as good as they taste - perfect for those photo moments. Let's do this! [PRODUCTS: Veuve Clicquot, Aperol Spritz Kit, Ranch Water Variety Pack]"
    ],
    default: [
      "Havin' a little technical hiccup here, but no worries! Let me put together a solid selection for your celebration. \n\n[PACKAGE: \"Essential Entertainment\"]\n- 2x Tito's Vodka\n- 1x Grey Goose\n- 3x Ranch Water\n- 2x Corona\n- 1x Woodford Reserve\n- 2x Tonic Water\n[/PACKAGE]",
      "Well, my systems are actin' up a bit, but I got you covered! Here's a great selection to get the party started. \n\n[PACKAGE: \"Classic Celebration\"]\n- 1x Macallan\n- 2x Veuve Clicquot\n- 3x Modelo\n- 2x Tito's\n- 1x Aperol\n- 2x Club Soda\n[/PACKAGE]"
    ]
  }

  const modeResponses = responses[mode as keyof typeof responses] || responses.default
  return modeResponses[Math.floor(Math.random() * modeResponses.length)]
}