let depth = 0;

export function isSilentFetch() {
  return depth > 0;
}

export async function runSilently<T>(fn: () => Promise<T>): Promise<T> {
  depth++;
  try {
    return await fn();
  } finally {
    depth--;
  }
}
