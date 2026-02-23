import { betterAuth } from 'better-auth';
import { organization, twoFactor } from 'better-auth/plugins';

export interface AuthConfig {
  database: {
    connectionString: string;
  };
  baseURL: string;
  secret: string;
  socialProviders?: {
    google?: { clientId: string; clientSecret: string };
    github?: { clientId: string; clientSecret: string };
  };
  trustedOrigins?: string[];
}

export function createAuth(config: AuthConfig) {
  return betterAuth({
    database: {
      type: 'postgres',
      url: config.database.connectionString,
    },
    baseURL: config.baseURL,
    secret: config.secret,
    trustedOrigins: config.trustedOrigins ?? [],
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      ...(config.socialProviders?.google && {
        google: config.socialProviders.google,
      }),
      ...(config.socialProviders?.github && {
        github: config.socialProviders.github,
      }),
    },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
      }),
      twoFactor(),
    ],
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // update session every 24 hours
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
