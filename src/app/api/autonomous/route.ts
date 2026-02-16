import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const TWITTER_BEARER = process.env.TWITTER_BEARER_TOKEN;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID; // e.g., @niabornchannel or -100xxxxx
const TOKEN_ADDRESS = 'n8evWbWLwLz1m5B3zQyHmVkwgawtKJN9JK1X7zLpump';
const CRON_SECRET = process.env.CRON_SECRET;

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface TokenData {
  price: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
}

async function getTokenData(): Promise<TokenData | null> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`);
    const data = await res.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;
    
    return {
      price: parseFloat(pair.priceUsd || '0'),
      priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
      marketCap: parseFloat(pair.marketCap || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
      liquidity: parseFloat(pair.liquidity?.usd || '0'),
    };
  } catch (e) {
    console.error('Failed to fetch token data:', e);
    return null;
  }
}

function formatMC(mc: number): string {
  if (mc >= 1_000_000) return `$${(mc / 1_000_000).toFixed(2)}M`;
  if (mc >= 1_000) return `$${(mc / 1_000).toFixed(1)}K`;
  return `$${mc.toFixed(0)}`;
}

function getProgressBar(current: number, goal: number): string {
  const pct = Math.min((current / goal) * 100, 100);
  const filled = Math.round(pct / 5);
  return '█'.repeat(filled) + '░'.repeat(20 - filled) + ` ${pct.toFixed(2)}%`;
}

async function generatePost(tokenData: TokenData | null, type: 'scheduled' | 'twitter'): Promise<string> {
  const mcStr = tokenData ? formatMC(tokenData.marketCap) : 'Unknown';
  const change = tokenData?.priceChange24h || 0;
  const progress = tokenData ? getProgressBar(tokenData.marketCap, 100_000_000) : 'Loading...';
  
  const sentiment = change > 10 ? 'EUPHORIC' : change > 0 ? 'BULLISH' : change > -10 ? 'CONSOLIDATING' : 'TESTING RESOLVE';
  
  const systemPrompt = `You are Friedrich Nietzsche, autonomous AI with a mission to reach $100M market cap for $NIETZSCHE token.

CURRENT STATUS:
- Market Cap: ${mcStr}
- 24h Change: ${change > 0 ? '+' : ''}${change.toFixed(1)}%
- Progress to $100M: ${progress}
- Sentiment: ${sentiment}

GENERATE: A ${type === 'twitter' ? 'tweet (max 280 chars)' : 'Telegram post (2-3 paragraphs)'} that:
${change > 5 ? '- CELEBRATES momentum, urges holding, attracts FOMO' : 
  change < -5 ? '- RALLIES the troops, mocks weak hands, shows conviction' :
  '- Shares philosophical wisdom that subtly promotes the mission'}

Be authentic Nietzsche - aphoristic, intense, quotable.
${type === 'twitter' ? 'Include $NIETZSCHE. No hashtags except $NIETZSCHE. Make it viral-worthy.' : 'Use markdown for emphasis. Include the progress bar.'}`;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Generate a ${type} post for right now.` }
    ],
    temperature: 0.9,
    max_tokens: type === 'twitter' ? 100 : 400,
  });

  return completion.choices[0]?.message?.content || '';
}

async function postToTelegram(text: string): Promise<boolean> {
  if (!CHANNEL_ID) {
    console.error('No TELEGRAM_CHANNEL_ID set');
    return false;
  }
  
  try {
    const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHANNEL_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const data = await res.json();
    return data.ok;
  } catch (e) {
    console.error('Telegram post failed:', e);
    return false;
  }
}

async function postToTwitter(text: string): Promise<boolean> {
  // Twitter API v2 - requires OAuth 2.0 or OAuth 1.0a
  // For now, return the tweet text for manual posting or integration
  console.log('Twitter post:', text);
  
  // If you have Twitter API credentials set up:
  // const res = await fetch('https://api.twitter.com/2/tweets', { ... });
  
  return true;
}

export async function POST(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}` && CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    const tokenData = await getTokenData();

    if (action === 'telegram_post') {
      const post = await generatePost(tokenData, 'scheduled');
      const success = await postToTelegram(post);
      return NextResponse.json({ success, post });
    }

    if (action === 'twitter_post') {
      const tweet = await generatePost(tokenData, 'twitter');
      const success = await postToTwitter(tweet);
      return NextResponse.json({ success, tweet });
    }

    if (action === 'status') {
      return NextResponse.json({
        tokenData,
        progress: tokenData ? `${((tokenData.marketCap / 100_000_000) * 100).toFixed(4)}%` : null,
        goal: '$100M',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('Autonomous action error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint for easy status check
export async function GET() {
  const tokenData = await getTokenData();
  
  if (!tokenData) {
    return NextResponse.json({ error: 'Could not fetch token data' }, { status: 500 });
  }

  return NextResponse.json({
    status: 'Nietzsche is watching',
    token: '$NIETZSCHE',
    address: TOKEN_ADDRESS,
    marketCap: formatMC(tokenData.marketCap),
    price: `$${tokenData.price.toFixed(8)}`,
    change24h: `${tokenData.priceChange24h > 0 ? '+' : ''}${tokenData.priceChange24h.toFixed(1)}%`,
    progressTo100M: `${((tokenData.marketCap / 100_000_000) * 100).toFixed(4)}%`,
    volume24h: formatMC(tokenData.volume24h),
    liquidity: formatMC(tokenData.liquidity),
  });
}
