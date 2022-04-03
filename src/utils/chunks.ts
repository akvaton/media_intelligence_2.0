export function getChunks<T>(
  array: Array<T>,
  step: number,
): Array<{ chunk: Array<T>; start: number; end: number }> {
  let start = 0;
  let end = step;
  const chunks = [];

  while (end <= array.length) {
    chunks.push({ chunk: array.slice(start, end), start, end });
    start += 1;
    end += 1;
  }

  return chunks;
}
