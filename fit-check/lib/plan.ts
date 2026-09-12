/**
 * One price, one place -- the same number renders in the paywall copy and
 * (once billing is wired up) checkout, so they can't drift apart.
 */
export const PLUS_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_PLUS_PRICE_CENTS ?? 499);

/** "$4.99" -- no trailing cents fuss, always two decimals. */
export const PLUS_PRICE_LABEL = `$${(PLUS_PRICE_CENTS / 100).toFixed(2)}`;

export const FREE_CHECKS_PER_MONTH = 5;
