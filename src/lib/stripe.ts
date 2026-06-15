import Stripe from "stripe";
// A chave secreta NUNCA vai para o frontend. Só é usada em código de servidor.
// Usamos um valor de reserva quando a chave ainda não está configurada, para o
// build/arranque não falhar (útil enquanto testas só o design, sem pagamentos).
// O pagamento só funciona quando STRIPE_SECRET_KEY estiver realmente preenchida.
export const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_not_configured");
