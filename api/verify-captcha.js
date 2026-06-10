/**
 * Netlify Function: Verify CAPTCHA token
 * Handles verification for reCAPTCHA, hCaptcha, or Turnstile
 */

const fetch = require('node-fetch');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { token, provider } = JSON.parse(event.body);

    if (!token || !provider) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing token or provider' })
      };
    }

    let isValid = false;

    if (provider === 'recaptcha') {
      isValid = await verifyRecaptcha(token);
    } else if (provider === 'hcaptcha') {
      isValid = await verifyHcaptcha(token);
    } else if (provider === 'turnstile') {
      isValid = await verifyTurnstile(token);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unknown provider' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: isValid })
    };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Verification failed', details: error.message })
    };
  }
};

/**
 * Verify reCAPTCHA v3 token
 */
async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    throw new Error('RECAPTCHA_SECRET_KEY not configured');
  }

  const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}`
  });

  const data = await response.json();
  
  // reCAPTCHA v3 returns a score between 0 and 1
  // 1.0 is very likely a legitimate interaction, 0.0 is very likely a bot
  // We'll accept scores above 0.5
  return data.success && data.score > 0.5;
}

/**
 * Verify hCaptcha token
 */
async function verifyHcaptcha(token) {
  const secretKey = process.env.HCAPTCHA_SECRET_KEY;

  if (!secretKey) {
    throw new Error('HCAPTCHA_SECRET_KEY not configured');
  }

  const response = await fetch('https://hcaptcha.com/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${secretKey}&response=${token}`
  });

  const data = await response.json();
  return data.success === true;
}

/**
 * Verify Cloudflare Turnstile token
 */
async function verifyTurnstile(token) {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('TURNSTILE_SECRET_KEY not configured');
  }

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret: secretKey,
      response: token
    })
  });

  const data = await response.json();
  return data.success === true;
}
