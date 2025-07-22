import fetch from 'node-fetch';
import crypto from 'crypto';

interface GeminiBalance {
  currency: string;
  amount: string;
  available: string;
}

interface PortfolioData {
  totalValue: number;
  totalReturns: number;
  dailyPnL: number;
  holdings: Array<{
    symbol: string;
    name: string;
    amount: string;
    price: number;
    value: number;
    change24h: number;
  }>;
}

export async function validateGeminiCredentials(apiKey: string, apiSecret: string): Promise<boolean> {
  try {
    const url = 'https://api.gemini.com/v1/account';
    const request = {
      request: '/v1/account',
      nonce: Date.now().toString(),
    };

    const payload = Buffer.from(JSON.stringify(request)).toString('base64');
    const signature = crypto
      .createHmac('sha384', apiSecret)
      .update(payload)
      .digest('hex');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        'X-GEMINI-APIKEY': apiKey,
        'X-GEMINI-PAYLOAD': payload,
        'X-GEMINI-SIGNATURE': signature,
      },
    });

    return response.ok;
  } catch (error) {
    console.error('Error validating Gemini credentials:', error);
    return false;
  }
}

export async function getPortfolioData(apiKey: string, apiSecret: string): Promise<PortfolioData> {
  try {
    // Get account balances
    const balances = await getGeminiBalances(apiKey, apiSecret);
    
    // Get current prices for crypto assets
    const holdings = [];
    let totalValue = 0;
    
    for (const balance of balances) {
      if (parseFloat(balance.amount) > 0 && balance.currency !== 'USD' && balance.currency !== 'SGD') {
        try {
          const ticker = await getGeminiTicker(balance.currency);
          const amount = parseFloat(balance.amount);
          const price = parseFloat(ticker.last);
          const value = amount * price;
          
          holdings.push({
            symbol: balance.currency.toUpperCase(),
            name: getCryptoName(balance.currency),
            amount: balance.amount,
            price: price,
            value: value,
            change24h: parseFloat(ticker.change || '0'),
          });
          
          totalValue += value;
        } catch (error) {
          console.error(`Error fetching ticker for ${balance.currency}:`, error);
        }
      }
    }

    // For demo purposes, calculate returns based on some logic
    // In a real implementation, you'd store historical data
    const totalReturns = totalValue * 0.15; // Assume 15% returns for demo
    const dailyPnL = totalValue * 0.02; // Assume 2% daily change for demo

    return {
      totalValue,
      totalReturns,
      dailyPnL,
      holdings,
    };
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    throw new Error('Failed to fetch portfolio data from Gemini');
  }
}

async function getGeminiBalances(apiKey: string, apiSecret: string): Promise<GeminiBalance[]> {
  const url = 'https://api.gemini.com/v1/balances';
  const request = {
    request: '/v1/balances',
    nonce: Date.now().toString(),
  };

  const payload = Buffer.from(JSON.stringify(request)).toString('base64');
  const signature = crypto
    .createHmac('sha384', apiSecret)
    .update(payload)
    .digest('hex');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'X-GEMINI-APIKEY': apiKey,
      'X-GEMINI-PAYLOAD': payload,
      'X-GEMINI-SIGNATURE': signature,
    },
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.statusText}`);
  }

  return await response.json() as GeminiBalance[];
}

async function getGeminiTicker(symbol: string): Promise<any> {
  const url = `https://api.gemini.com/v1/pubticker/${symbol}usd`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Gemini ticker API error: ${response.statusText}`);
  }

  return await response.json();
}

function getCryptoName(symbol: string): string {
  const names: Record<string, string> = {
    BTC: 'Bitcoin',
    ETH: 'Ethereum',
    LTC: 'Litecoin',
    BCH: 'Bitcoin Cash',
    ZEC: 'Zcash',
    ADA: 'Cardano',
    LINK: 'Chainlink',
    DAI: 'Dai',
    AAVE: 'Aave',
    UNI: 'Uniswap',
  };
  
  return names[symbol.toUpperCase()] || symbol.toUpperCase();
}