export interface PlanLimits {
  maxOutcomes: number;
  maxExperimentsPerOutcome: number;
  maxAgents: number;
  maxSignalConnectors: number;
  llmTokensPerMonth: number;
  features: {
    customConnectors: boolean;
    ssoSaml: boolean;
    auditLogs: boolean;
    prioritySupport: boolean;
    whiteLabel: boolean;
  };
}

export interface Plan {
  id: string;
  name: string;
  stripePriceId: string;
  monthlyPrice: number;
  limits: PlanLimits;
}

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    stripePriceId: '',
    monthlyPrice: 0,
    limits: {
      maxOutcomes: 2,
      maxExperimentsPerOutcome: 3,
      maxAgents: 1,
      maxSignalConnectors: 2,
      llmTokensPerMonth: 100_000,
      features: {
        customConnectors: false,
        ssoSaml: false,
        auditLogs: false,
        prioritySupport: false,
        whiteLabel: false,
      },
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    stripePriceId: 'price_pro_monthly',
    monthlyPrice: 49,
    limits: {
      maxOutcomes: 20,
      maxExperimentsPerOutcome: 10,
      maxAgents: 5,
      maxSignalConnectors: 10,
      llmTokensPerMonth: 1_000_000,
      features: {
        customConnectors: true,
        ssoSaml: false,
        auditLogs: true,
        prioritySupport: false,
        whiteLabel: false,
      },
    },
  },
  team: {
    id: 'team',
    name: 'Team',
    stripePriceId: 'price_team_monthly',
    monthlyPrice: 199,
    limits: {
      maxOutcomes: 100,
      maxExperimentsPerOutcome: 20,
      maxAgents: 20,
      maxSignalConnectors: 50,
      llmTokensPerMonth: 10_000_000,
      features: {
        customConnectors: true,
        ssoSaml: true,
        auditLogs: true,
        prioritySupport: true,
        whiteLabel: false,
      },
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    stripePriceId: 'price_enterprise_monthly',
    monthlyPrice: -1, // Custom pricing
    limits: {
      maxOutcomes: Infinity,
      maxExperimentsPerOutcome: Infinity,
      maxAgents: Infinity,
      maxSignalConnectors: Infinity,
      llmTokensPerMonth: Infinity,
      features: {
        customConnectors: true,
        ssoSaml: true,
        auditLogs: true,
        prioritySupport: true,
        whiteLabel: true,
      },
    },
  },
};

export function getPlan(planId: string): Plan {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  return plan;
}
