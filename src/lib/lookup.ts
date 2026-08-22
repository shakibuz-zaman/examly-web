// The prototype-key guard, in one place. The wire hands us bare strings (an order `kind`, a
// withdrawal `status`, a ledger entry kind) and the maps they index are plain object literals,
// so `MAP[key]` for a value like "constructor" resolves THROUGH Object.prototype to a function:
// truthy, so `MAP[key] ?? fallback` keeps it, and React throws when that function reaches it as
// a child. `Object.hasOwn` is the whole fix, and `??`/truthiness is not — which is why this is
// a named import rather than a line each surface is trusted to remember.
//
// StatusChip and WalletPage still carry their own copies (WalletPage's is this function
// verbatim); Task 8's sweep folds them in. New call sites import this one.
export function lookup<T>(map: Record<string, T>, key: string): T | null {
  return Object.hasOwn(map, key) ? map[key] : null;
}
