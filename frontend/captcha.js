/**
 * CAPTCHA Integration for Play2Study
 * Adds CAPTCHA verification after user login
 */

class CaptchaManager {
  constructor(config = {}) {
    this.provider = config.provider || 'recaptcha'; // 'recaptcha' | 'hcaptcha' | 'turnstile'
    this.siteKey = config.siteKey;
    this.verifyEndpoint = config.verifyEndpoint || '/api/verify-captcha';
    this.onSuccess = config.onSuccess || (() => {});
    this.onError = config.onError || (() => {});
  }

  /**
   * Load reCAPTCHA script
   */
  loadRecaptcha() {
    if (window.grecaptcha) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load reCAPTCHA'));
      document.head.appendChild(script);
    });
  }

  /**
   * Load hCaptcha script
   */
  loadHcaptcha() {
    if (window.hcaptcha) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load hCaptcha'));
      document.head.appendChild(script);
    });
  }

  /**
   * Load Cloudflare Turnstile script
   */
  loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Turnstile'));
      document.head.appendChild(script);
    });
  }

  /**
   * Show CAPTCHA modal after login
   */
  async showCaptcha() {
    try {
      // Load appropriate CAPTCHA provider
      if (this.provider === 'recaptcha') {
        await this.loadRecaptcha();
      } else if (this.provider === 'hcaptcha') {
        await this.loadHcaptcha();
      } else if (this.provider === 'turnstile') {
        await this.loadTurnstile();
      }

      // Create modal container
      const modal = this.createCaptchaModal();
      document.body.appendChild(modal);

      // Return promise that resolves when CAPTCHA is verified
      return new Promise((resolve, reject) => {
        const verifyBtn = modal.querySelector('.captcha-verify-btn');
        const closeBtn = modal.querySelector('.captcha-close-btn');

        verifyBtn.addEventListener('click', async () => {
          try {
            const token = await this.getCaptchaToken();
            const isValid = await this.verifyCaptcha(token);
            
            if (isValid) {
              this.onSuccess();
              modal.remove();
              resolve(true);
            } else {
              throw new Error('CAPTCHA verification failed');
            }
          } catch (error) {
            this.onError(error);
            reject(error);
          }
        });

        closeBtn.addEventListener('click', () => {
          modal.remove();
          reject(new Error('User closed CAPTCHA modal'));
        });
      });
    } catch (error) {
      console.error('Captcha error:', error);
      this.onError(error);
      throw error;
    }
  }

  /**
   * Get CAPTCHA token based on provider
   */
  async getCaptchaToken() {
    if (this.provider === 'recaptcha') {
      return new Promise((resolve, reject) => {
        window.grecaptcha.execute(this.siteKey, { action: 'login' }).then(token => {
          resolve(token);
        }).catch(reject);
      });
    } else if (this.provider === 'hcaptcha') {
      const response = window.hcaptcha.getResponse();
      if (!response) throw new Error('hCaptcha not completed');
      return response;
    } else if (this.provider === 'turnstile') {
      const token = window.turnstile.getResponse();
      if (!token) throw new Error('Turnstile not completed');
      return token;
    }
  }

  /**
   * Verify CAPTCHA token on backend
   */
  async verifyCaptcha(token) {
    const response = await fetch(this.verifyEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        provider: this.provider
      })
    });

    if (!response.ok) {
      throw new Error('Backend verification failed');
    }

    const data = await response.json();
    return data.success === true;
  }

  /**
   * Create CAPTCHA modal HTML
   */
  createCaptchaModal() {
    const overlay = document.createElement('div');
    overlay.className = 'captcha-overlay active';
    overlay.innerHTML = `
      <div class="captcha-modal">
        <div class="captcha-header">
          <span class="captcha-title">🔐 Верификация</span>
          <button class="captcha-close-btn" aria-label="Закрыть">×</button>
        </div>
        
        <div class="captcha-body">
          <p class="captcha-desc">Пожалуйста, подтвердите, что вы не робот</p>
          <div id="captcha-container" class="captcha-container"></div>
        </div>
        
        <div class="captcha-footer">
          <button class="captcha-verify-btn">Проверить</button>
        </div>
      </div>
    `;

    // Render CAPTCHA widget in container
    setTimeout(() => {
      const container = overlay.querySelector('#captcha-container');
      if (this.provider === 'recaptcha') {
        window.grecaptcha.render(container, {
          sitekey: this.siteKey,
          theme: 'dark'
        });
      } else if (this.provider === 'hcaptcha') {
        window.hcaptcha.render(container, {
          sitekey: this.siteKey,
          theme: 'dark'
        });
      } else if (this.provider === 'turnstile') {
        window.turnstile.render(container, {
          sitekey: this.siteKey,
          theme: 'dark'
        });
      }
    }, 0);

    return overlay;
  }
}

// Export for use in other modules
window.CaptchaManager = CaptchaManager;
