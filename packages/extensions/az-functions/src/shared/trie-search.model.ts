export interface TrieNode<T> {
  children?: Record<string, TrieNode<T>>;
  value?: T;
}
