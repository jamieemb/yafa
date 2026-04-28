// Find a subset of `amounts` (in integer pence) that sums exactly to
// `target`. Returns the indices of the matching items in the original
// `amounts` array, or null if no exact subset exists.
//
// The algorithm preserves the caller's order — items are tried in the
// order they're passed in. So if the caller sorts by recency, the
// first match returned will favour recent items, which is usually
// what the user means by "this week's payment covered these
// transactions".
//
// Handles SIGNED inputs: positives (charges, debits) and negatives
// (refunds, credits) can mix. Pruning uses both the max reachable sum
// (positives only) and the min reachable sum (negatives only) from
// each suffix to bail when target is out of range.
//
// A safety iteration cap prevents pathological inputs from hanging.
const MAX_ITERATIONS = 200_000;

export function findSubsetSumIndices(
  amounts: number[],
  target: number,
): number[] | null {
  const indexed = amounts
    .map((a, i) => ({ amount: a, originalIndex: i }))
    .filter((e) => e.amount !== 0);

  const n = indexed.length;
  const maxSuffix = new Array(n + 1).fill(0);
  const minSuffix = new Array(n + 1).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    const a = indexed[i].amount;
    maxSuffix[i] = maxSuffix[i + 1] + (a > 0 ? a : 0);
    minSuffix[i] = minSuffix[i + 1] + (a < 0 ? a : 0);
  }

  if (target > maxSuffix[0] || target < minSuffix[0]) return null;

  let iterations = 0;
  let aborted = false;

  function dfs(start: number, remaining: number, picked: number[]): number[] | null {
    iterations++;
    if (iterations > MAX_ITERATIONS) {
      aborted = true;
      return null;
    }
    if (remaining === 0) return picked.slice();
    if (start >= n) return null;
    if (remaining > maxSuffix[start]) return null;
    if (remaining < minSuffix[start]) return null;

    for (let k = start; k < n; k++) {
      const item = indexed[k];
      picked.push(item.originalIndex);
      const result = dfs(k + 1, remaining - item.amount, picked);
      if (result) return result;
      picked.pop();
      if (aborted) return null;
    }
    return null;
  }

  return dfs(0, target, []);
}

export function poundsToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

// Convert a stored signed transaction amount into the "balance impact"
// integer pence that the subset-sum operates on:
//   charge of -£12.34  -> +1234 (adds to debt the cardholder owes)
//   refund of +£3.50   -> −350  (reduces debt)
// Sum of impacts equals the amount the cardholder pays to clear them.
export function balanceImpactPence(amount: number): number {
  return Math.round(-amount * 100);
}
