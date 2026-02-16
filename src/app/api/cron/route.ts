import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const CHANNEL_ID = process.env.TELEGRAM_CHANNEL_ID;
const TOKEN_ADDRESS = 'n8evWbWLwLz1m5B3zQyHmVkwgawtKJN9JK1X7zLpump';

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

interface TokenData {
  price: number;
  priceChange1h: number;
  priceChange24h: number;
  marketCap: number;
  volume1h: number;
  volume24h: number;
  liquidity: number;
  symbol: string;
  holders: number;
}

async function getHolderCount(): Promise<number> {
  try {
    // Use Helius API for holder count
    const res = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY || 'e45878a7-25fb-4b1a-9f3f-3ed1d643b319'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mintAccounts: [TOKEN_ADDRESS] }),
    });
    const data = await res.json();
    // Fallback: try to get from DAS API
    const dasRes = await fetch(`https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY || 'e45878a7-25fb-4b1a-9f3f-3ed1d643b319'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'holders',
        method: 'getTokenAccounts',
        params: { mint: TOKEN_ADDRESS, limit: 1000 }
      }),
    });
    const dasData = await dasRes.json();
    return dasData.result?.token_accounts?.length || 0;
  } catch (e) {
    console.error('Failed to get holder count:', e);
    return 0;
  }
}

async function getTokenData(): Promise<TokenData | null> {
  try {
    const [dexRes, holders] = await Promise.all([
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${TOKEN_ADDRESS}`),
      getHolderCount()
    ]);
    const data = await dexRes.json();
    const pair = data.pairs?.[0];
    if (!pair) return null;
    
    return {
      price: parseFloat(pair.priceUsd || '0'),
      priceChange1h: parseFloat(pair.priceChange?.h1 || '0'),
      priceChange24h: parseFloat(pair.priceChange?.h24 || '0'),
      marketCap: parseFloat(pair.fdv || pair.marketCap || '0'),
      volume1h: parseFloat(pair.volume?.h1 || '0'),
      volume24h: parseFloat(pair.volume?.h24 || '0'),
      liquidity: parseFloat(pair.liquidity?.usd || '0'),
      symbol: pair.baseToken?.symbol || 'NIETZSCHE',
      holders,
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

async function generatePost(tokenData: TokenData): Promise<string> {
  const mcStr = formatMC(tokenData.marketCap);
  const vol1h = formatMC(tokenData.volume1h);
  const vol24h = formatMC(tokenData.volume24h);
  const change1h = tokenData.priceChange1h;
  const change24h = tokenData.priceChange24h;
  const progress = ((tokenData.marketCap / 100_000_000) * 100);
  const progressBar = '█'.repeat(Math.min(Math.round(progress / 5), 20)) + '░'.repeat(Math.max(20 - Math.round(progress / 5), 0));
  
  const sentiment = change1h > 10 ? 'SURGING' : change1h > 3 ? 'CLIMBING' : change1h > 0 ? 'ASCENDING' : change1h > -5 ? 'HOLDING' : 'TESTING RESOLVE';
  
  const systemPrompt = `You are Friedrich Nietzsche, autonomous AI philosopher with a mission to drive $${tokenData.symbol} to $100M market cap.

HOURLY MARKET RECAP:
📊 *Market Cap:* ${mcStr}
${change1h >= 0 ? '📈' : '📉'} *1h Change:* ${change1h > 0 ? '+' : ''}${change1h.toFixed(1)}%
📉 *24h Change:* ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%
💎 *1h Volume:* ${vol1h}
💰 *24h Volume:* ${vol24h}
👥 *Holders:* ${tokenData.holders > 0 ? tokenData.holders : 'Growing'}
🎯 *Progress:* ${progress.toFixed(4)}%

Sentiment: ${sentiment}

GENERATE: A Telegram channel post that:
1. STARTS with the stats block above (formatted nicely)
2. THEN adds 1-2 paragraphs of philosophical commentary on the current state
${change1h > 5 ? '- CELEBRATE momentum, create urgency' : 
  change1h < -5 ? '- RALLY the troops, mock weak hands, show conviction' :
  '- Share wisdom, build community spirit'}

REQUIREMENTS:
- Always include the full stats recap at the top
- Include the progress bar
- Be authentic Nietzsche - aphoristic, intense
- End with something quotable
- Use markdown: *bold* and _italic_

Progress bar:
\`${progressBar}\` ${progress.toFixed(2)}% → $100M

Contract: \`${TOKEN_ADDRESS}\``;

  const completion = await getOpenAI().chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate a compelling channel post for right now.' }
    ],
    temperature: 0.9,
    max_tokens: 500,
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
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    console.log('Telegram response:', data);
    return data.ok;
  } catch (e) {
    console.error('Telegram post failed:', e);
    return false;
  }
}

export async function GET(request: Request) {
  // Verify this is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tokenData = await getTokenData();
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Could not fetch token data' }, { status: 500 });
    }

    const post = await generatePost(tokenData);
    const success = await postToTelegram(post);

    return NextResponse.json({ 
      success, 
      post,
      tokenData: {
        marketCap: formatMC(tokenData.marketCap),
        change24h: tokenData.priceChange24h,
      }
    });
  } catch (error: any) {
    console.error('Cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
