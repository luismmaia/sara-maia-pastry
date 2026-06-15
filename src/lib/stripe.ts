import Stripe from "stripe";
// A chave secreta NUNCA vai para o frontend. Só é usada em código de servidor.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-10-28.acacia",
});
