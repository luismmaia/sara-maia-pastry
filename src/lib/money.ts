// Tudo é guardado em cêntimos (inteiros) para evitar erros de vírgula flutuante.
export const eur = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(cents / 100);
