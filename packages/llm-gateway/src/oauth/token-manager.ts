import type { OAuthProvider, OAuthTokens } from './types.js';

/**
 * Manages OAuth token lifecycle — caching, refresh, and validation.
 */
export class TokenManager {
  private tokenCache = new Map<string, OAuthTokens>();

  constructor(
    private providers: Map<string, OAuthProvider>,
    private onTokensUpdated?: (orgId: string, provider: string, tokens: OAuthTokens) => Promise<void>,
  ) {}

  /**
   * Get a valid access token for the given org and provider.
   * Automatically refreshes if expired.
   */
  async getAccessToken(orgId: string, providerName: string, storedTokens: OAuthTokens): Promise<string> {
    const cacheKey = `${orgId}:${providerName}`;
    const cached = this.tokenCache.get(cacheKey);

    // Use cached if still valid
    if (cached && this.isValid(cached)) {
      return cached.accessToken;
    }

    // Use stored if still valid
    if (this.isValid(storedTokens)) {
      this.tokenCache.set(cacheKey, storedTokens);
      return storedTokens.accessToken;
    }

    // Refresh
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`No OAuth provider registered for: ${providerName}`);
    }

    const refreshed = await provider.refreshTokens(storedTokens.refreshToken);
    this.tokenCache.set(cacheKey, refreshed);

    // Persist updated tokens
    if (this.onTokensUpdated) {
      await this.onTokensUpdated(orgId, providerName, refreshed);
    }

    return refreshed.accessToken;
  }

  /**
   * Store tokens after initial OAuth exchange.
   */
  setTokens(orgId: string, providerName: string, tokens: OAuthTokens): void {
    const cacheKey = `${orgId}:${providerName}`;
    this.tokenCache.set(cacheKey, tokens);
  }

  /**
   * Clear cached tokens (e.g., on disconnect).
   */
  clearTokens(orgId: string, providerName: string): void {
    const cacheKey = `${orgId}:${providerName}`;
    this.tokenCache.delete(cacheKey);
  }

  private isValid(tokens: OAuthTokens): boolean {
    return tokens.expiresAt.getTime() > Date.now() + 60_000;
  }
}
