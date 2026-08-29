interface TrieNode<T> {
  children: Record<string, TrieNode<T>>;
  value?: T;
}

interface TraverseResult<T> {
  part: string;
  name: string;
  parentNode?: TraverseResult<T>;
  trieNode: TrieNode<T>;
}

/**
 * A service that provides a trie data structure for searching and storing values associated with string keys.
 *
 * This class can be used for providing of log levels for loggers based on their names, where the logger names are structured in a hierarchical manner using a separator (e.g., '.').
 *
 * @template T - The type of values stored in the trie.
 *
 * @example
 * export class TrieSearchLogLevelProvider implements LogLevelProvider {
 *   private readonly trieSearchService: TrieSearchService<LogLevel>;
 *
 *   constructor(@inject(DEFAULT_LOG_LEVEL) @optional() defaultLogLevel: LogLevel) {
 *     this.trieSearchService = new TrieSearchService('.', defaultLogLevel);
 *     this.trieSearchService.set(SYSTEM_LOGGER_NAME_PREFIX, 'silly');
 *     this.trieSearchService.set(PERSISTENCE_KYSELY_LOGGER_NAME, 'error');
 *   }
 *
 *   getLogLevel(loggerName: string | undefined): LogLevel | undefined {
 *     return this.trieSearchService.find(loggerName);
 *   }
 * }
 */
export class TrieSearchService<T> {
  private readonly root: Required<TrieNode<T>>;

  /**
   * Creates an instance of TrieSearchService.
   *
   * @param trieSeparator - The separator used to split the keys into parts for the trie structure.
   * @param rootValue - The value associated with the root of the trie.
   */
  constructor(
    private readonly trieSeparator: string,
    rootValue: T,
  ) {
    this.root = { children: {}, value: rootValue };
  }

  /**
   * Retrieves all key-value pairs in the trie that match the specified prefix.
   *
   * @param prefix - An optional prefix to filter the keys. If provided, only keys starting with this prefix will be included in the result.
   * @returns A record containing all matching key-value pairs.
   */
  getAll(prefix?: string): Record<string, T> {
    const traverseResult = this.traverse(prefix);
    if (traverseResult.name === (prefix ?? '')) {
      return this.getAllChildren(traverseResult.trieNode, traverseResult.name);
    } else {
      return {};
    }
  }

  private getAllChildren(node: TrieNode<T>, name: string): Record<string, T> {
    const result: Record<string, T> = node.value !== undefined ? { [name]: node.value } : {};
    const keys = Object.keys(node.children);
    keys.sort((a, b) => a.localeCompare(b));
    for (const key of keys) {
      const childNode = node.children[key]!;
      const childName = name ? `${name}${this.trieSeparator}${key}` : key;
      Object.assign(result, this.getAllChildren(childNode, childName));
    }
    return result;
  }

  /**
   * Finds the value associated with the longest matching prefix of the specified key in the trie.
   *
   * @param key - The key to search for in the trie. If undefined, the root value will be returned.
   * @returns The value associated with the longest matching prefix of the key, or undefined if no match is found.
   */
  find(key: string | undefined): T {
    let traverseResult = this.traverse(key ?? '');
    let result = traverseResult.trieNode.value;
    while (result === undefined && traverseResult.parentNode !== undefined) {
      traverseResult = traverseResult.parentNode;
      result = traverseResult.trieNode.value;
    }
    return result!;
  }

  /**
   * Retrieves the value associated with the specified key in the trie.
   *
   * @param key - The key to search for in the trie.
   * @returns The value associated with the key, or undefined if the key is not found.
   */
  get(key: string): T | undefined {
    const traverseResult = this.traverse(key);
    if (traverseResult.name === key) {
      return traverseResult.trieNode.value;
    }
  }

  /**
   * Sets the value associated with the specified key in the trie. If the value is undefined, the key will be removed from the trie.
   *
   * @param key - The key to set or remove in the trie.
   * @param value - The value to associate with the key. If undefined, the key will be removed.
   */
  set(key: string, value?: T): void {
    const traverseResult = this.traverse(key);

    if (value !== undefined) {
      const prefix = traverseResult.name;
      const restKey = prefix && key.startsWith(prefix) ? key.substring(traverseResult.name.length + 1) : key;
      this.concatNodes(traverseResult.trieNode, restKey, value);
    } else {
      if (traverseResult.name === key) {
        delete traverseResult.trieNode.value;
      }
      this.removeNodes(traverseResult);
    }
  }

  private traverse(key?: string): TraverseResult<T> {
    const parts = key ? key.split(this.trieSeparator) : [];
    let currentNode: TrieNode<T> = this.root;
    let traverseResult: TraverseResult<T> = { part: '', name: '', trieNode: currentNode };

    for (const part of parts) {
      if (currentNode.children?.[part] === undefined) {
        break;
      }
      currentNode = currentNode.children[part];
      const name = traverseResult.name ? `${traverseResult.name}${this.trieSeparator}${part}` : part;
      traverseResult = {
        part,
        name,
        parentNode: traverseResult,
        trieNode: currentNode,
      };
    }
    return traverseResult;
  }

  private concatNodes(node: TrieNode<T>, restKey: string, value: T) {
    const parts = restKey ? restKey.split(this.trieSeparator) : [];
    let currentNode = node;
    for (const part of parts) {
      const child = {
        children: {},
      };
      currentNode.children[part] = child;
      currentNode = child;
    }
    currentNode.value = value;
  }

  private removeNodes(traverseResult: TraverseResult<T>) {
    let currentNode = traverseResult.trieNode;
    let part: string | undefined;
    while (traverseResult.parentNode) {
      if (currentNode.children && Object.keys(currentNode.children).length > 0) {
        break;
      }
      currentNode = traverseResult.trieNode;
      part = traverseResult.part;
      traverseResult = traverseResult.parentNode;
      if (currentNode.value === undefined) {
        delete currentNode.children[part];
      }
    }
  }
}
