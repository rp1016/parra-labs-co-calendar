export interface Slot<T> {
  item: T;
  column: number;
  columns: number;
}

/** Places overlapping intervals side by side. A new cluster starts as soon as
 *  there is a gap, so a busy morning does not shrink the whole day. */
export function layoutDay<T extends { start: Date; end: Date }>(items: T[]): Slot<T>[] {
  const sorted = [...items].sort((a, b) => a.start.getTime() - b.start.getTime());
  const out: Slot<T>[] = [];
  let cluster: Slot<T>[] = [];
  let columnEnds: number[] = [];
  let clusterEnd = Number.NEGATIVE_INFINITY;

  const flush = () => {
    for (const slot of cluster) slot.columns = Math.max(1, columnEnds.length);
    out.push(...cluster);
    cluster = [];
    columnEnds = [];
    clusterEnd = Number.NEGATIVE_INFINITY;
  };

  for (const item of sorted) {
    const start = item.start.getTime();
    const end = Math.max(item.end.getTime(), start + 1);
    if (start >= clusterEnd) flush();

    let column = columnEnds.findIndex((value) => value <= start);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(end);
    } else {
      columnEnds[column] = end;
    }

    const slot: Slot<T> = { item, column, columns: 1 };
    cluster.push(slot);
    clusterEnd = Math.max(clusterEnd, end);
  }

  flush();
  return out;
}
