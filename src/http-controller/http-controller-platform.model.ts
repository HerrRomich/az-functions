import { HttpMethod, HttpRequest, InvocationContext } from '@azure/functions';
import { AzureFunctionError, UserAccount } from 'shared';
import { OperationMethod } from './decorators';

export class HttpControllerDefinitionError extends AzureFunctionError {}

export interface AsyncHttpRequestProviderInput {
  request: HttpRequest;
  context: InvocationContext;
  userAccount: UserAccount;
  queryItems: URLSearchParams;
}
export type AsyncHttpRequestProvider = (input: AsyncHttpRequestProviderInput) => unknown;
export type AsyncHttpRequestArgsProvider = (
  request: HttpRequest,
  context: InvocationContext,
  userAccount: UserAccount,
) => Promise<unknown[]>;

export const httpMethodMap: Record<OperationMethod, HttpMethod> = {
  get: 'GET',
  head: 'HEAD',
  delete: 'DELETE',
  post: 'POST',
  put: 'PUT',
  patch: 'PATCH',
};
