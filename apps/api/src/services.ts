/**
 * Service singleton instances for the API layer.
 * In production, replace InMemory stores with real database stores.
 */

import { AgentRegistry } from '@outcome-runtime/agent-sdk';
import { GateManager, ConsoleNotificationChannel } from '@outcome-runtime/human-gates';
import { LearningLibrary } from '@outcome-runtime/learning-library';
import { BillingService, type BillingConfig } from '@outcome-runtime/billing';
import {
  InMemoryAgentRegistryStore,
  InMemoryGateStore,
  InMemoryLearningStore,
  InMemorySubscriptionStore,
  InMemoryOutcomeStore,
  InMemoryExperimentStore,
  InMemoryWorkspaceStore,
  InMemoryProviderStore,
  InMemorySignalStore,
} from './stores/in-memory.js';

// ---------------------------------------------------------------------------
// Stores (singleton instances)
// ---------------------------------------------------------------------------

export const agentRegistryStore = new InMemoryAgentRegistryStore();
export const gateStore = new InMemoryGateStore();
export const learningStore = new InMemoryLearningStore();
export const subscriptionStore = new InMemorySubscriptionStore();
export const outcomeStore = new InMemoryOutcomeStore();
export const experimentStore = new InMemoryExperimentStore();
export const workspaceStore = new InMemoryWorkspaceStore();
export const providerStore = new InMemoryProviderStore();
export const signalStore = new InMemorySignalStore();

// ---------------------------------------------------------------------------
// Services (singleton instances)
// ---------------------------------------------------------------------------

export const agentRegistry = new AgentRegistry(agentRegistryStore);

export const gateManager = new GateManager(gateStore, [new ConsoleNotificationChannel()]);

export const learningLibrary = new LearningLibrary(learningStore);

// BillingService requires Stripe keys — create lazily only when configured
let _billingService: BillingService | null = null;

export function getBillingService(): BillingService | null {
  if (_billingService) return _billingService;

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !stripeWebhookSecret) return null;

  const config: BillingConfig = {
    stripeSecretKey,
    stripeWebhookSecret,
    successUrl: process.env.BILLING_SUCCESS_URL ?? 'http://localhost:3000/settings/billing?success=true',
    cancelUrl: process.env.BILLING_CANCEL_URL ?? 'http://localhost:3000/settings/billing?canceled=true',
  };

  _billingService = new BillingService(config, subscriptionStore);
  return _billingService;
}
