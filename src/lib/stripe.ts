import Stripe from "stripe";
// A chave secreta NUNCA vai para o frontend. Só é usada em código de servidor.
// Sem apiVersion fixa: a biblioteca usa a sua versão por defeito, evitando erros de tipo no build.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
