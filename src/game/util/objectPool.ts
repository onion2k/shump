export class ObjectPool<T> {
  private readonly items: T[] = [];

  acquire(create: () => T): T {
    return this.items.pop() ?? create();
  }

  release(item: T) {
    this.items.push(item);
  }

  size() {
    return this.items.length;
  }
}
