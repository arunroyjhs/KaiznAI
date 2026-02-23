export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  scopes: string[];
  accountEmail?: string;
}

export interface OAuthProvider {
  name: string;
  authorizationUrl: string;
  tokenUrl: string;

  /** Generate the authorization URL for the user to visit */
  getAuthorizationUrl(state: string): string;

  /** Exchange an authorization code for tokens */
  exchangeCode(code: string): Promise<OAuthTokens>;

  /** Refresh an expired access token */
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;

  /** Check if tokens are still valid */
  isTokenValid(tokens: OAuthTokens): boolean;
}
