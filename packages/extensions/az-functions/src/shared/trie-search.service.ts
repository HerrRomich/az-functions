import { injectable } from 'inversify';
import { TrieNode } from './trie-search.model';

const TRIE_SEPARATOR = '.';
interface TraverseResult<T> {
  name?: string;
  parentNode?: TraverseResult<T>;
  trieNode: TrieNode<T>;
}

@injectable()
export class TrieSearchService<T> {
  private readonly root: Required<TrieNode<T>>;

  constructor(rootValue: T) {
    this.root = { children: {}, value: rootValue };
  }

  get(key: string | undefined): T {
    let result = this.root.value;
    const parts = (key ?? '').split(TRIE_SEPARATOR);
    let currentNode: TrieNode<T> = this.root;
    for (const part of parts) {
      if (currentNode.children === undefined || currentNode.children[part] === undefined) {
        break;
      }
      currentNode = currentNode.children[part];
      if (currentNode.value !== undefined) {
        result = currentNode.value;
      }
    }
    return result;
  }

  set(key: string, value?: T): void {
    const parts = key.split(TRIE_SEPARATOR);
    let currentNode: TrieNode<T> = this.root;
    let traverseResult: TraverseResult<T> = { trieNode: currentNode };

    for (const part of parts) {
      if (currentNode.children === undefined) {
        if (value === undefined) {
          return;
        }
        currentNode.children = {};
      }
      let childNode = currentNode.children[part];
      if (childNode === undefined) {
        if (value === undefined) {
          return;
        }
        childNode = {};
        currentNode.children[part] = childNode;
      }
      traverseResult = {
        name: part,
        parentNode: traverseResult,
        trieNode: currentNode,
      };
      currentNode = childNode;
    }
    if (value !== undefined) {
      currentNode.value = value;
    } else {
      this.removeNodes(currentNode, traverseResult);
    }
  }

  private removeNodes(currentNode: TrieNode<T>, traverseResult: TraverseResult<T>) {
    delete currentNode.value;
    let part: string | undefined;
    while (traverseResult.parentNode) {
      if (currentNode.children && Object.keys(currentNode.children).length > 0) {
        break;
      }
      currentNode = traverseResult.trieNode;
      part = traverseResult.name;
      traverseResult = traverseResult.parentNode;
      if (currentNode.children !== undefined && part !== undefined && currentNode.value === undefined) {
        delete currentNode.children[part];
      }
    }
  }
}
