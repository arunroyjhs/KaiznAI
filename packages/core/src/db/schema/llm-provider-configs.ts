import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { orgs } from './orgs.js';

export const llmProviderConfigs = pgTable('llm_provider_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => orgs.id),

  provider: text('provider').notNull(),
  authMode: text('auth_mode').notNull(),

  encryptedApiKey: text('encrypted_api_key'),
  keyHint: text('key_hint'),

  oauthAccessToken: text('oauth_access_token'),
  oauthRefreshToken: text('oauth_refresh_token'),
  oauthExpiresAt: timestamp('oauth_expires_at', { withTimezone: true }),
  oauthScopes: text('oauth_scopes').array(),
  accountEmail: text('account_email'),

  preferredModel: text('preferred_model'),
  fallbackModel: text('fallback_model'),

  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
