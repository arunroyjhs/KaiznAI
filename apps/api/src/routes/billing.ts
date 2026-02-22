import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PLANS } from '@outcome-runtime/billing';

const checkoutSchema = z.object({
  planId: z.enum(['pro', 'team', 'enterprise']),
});

export async function billingRoutes(app: FastifyInstance) {
  // Get available plans
  app.get('/api/v1/billing/plans', async (_request, reply) => {
    const plans = Object.values(PLANS).map((plan) => ({
      id: plan.id,
      name: plan.name,
      monthlyPrice: plan.monthlyPrice,
      limits: plan.limits,
    }));
    return reply.send({ plans });
  });

  // Get current subscription
  app.get('/api/v1/billing/subscription', async (_request, reply) => {
    // TODO: Get orgId from auth context
    return reply.send({ subscription: null, planId: 'free' });
  });

  // Create checkout session
  app.post('/api/v1/billing/checkout', async (request, reply) => {
    const result = checkoutSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({ error: 'VALIDATION_ERROR', details: result.error.issues });
    }
    // TODO: Wire to BillingService.createCheckoutSession()
    return reply.send({ url: 'https://checkout.stripe.com/placeholder' });
  });

  // Create portal session
  app.post('/api/v1/billing/portal', async (_request, reply) => {
    // TODO: Wire to BillingService.createPortalSession()
    return reply.send({ url: 'https://billing.stripe.com/placeholder' });
  });

  // Stripe webhook
  app.post('/api/v1/billing/webhook', async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    if (!signature) {
      return reply.status(400).send({ error: 'Missing stripe-signature header' });
    }
    // TODO: Wire to BillingService.handleWebhook()
    return reply.send({ received: true });
  });
}
