import { HttpRequest, InvocationContext } from '@azure/functions';
import { UserAccount } from 'shared';

export interface AuthenticationService {
  authenticate(request: HttpRequest, context: InvocationContext): PromiseLike<UserAccount>;
}
