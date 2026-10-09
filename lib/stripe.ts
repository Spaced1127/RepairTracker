import Stripe from "stripe";

/** Returns null when Stripe is not configured, so the rest of the app still works. */
export const getStripe = () => (process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null);
