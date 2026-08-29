import { inject, injectable, optional } from 'inversify';
import { AuthContext, Principal } from 'security';
import { serviceIdentifier } from 'shared';
import { StrictPrincipalMergeService } from './strict-principal-merge.servce';

export const PRINCIPAL_MERGE_SERVICE = serviceIdentifier<PrincipalMergeService>('AzFunctions.PrincipalMergeService');

export interface PrincipalMergeService {
  mergePrincipals(principals: Principal[]): AuthContext;
}

@injectable()
export class FallbackPrincipalMergeService implements PrincipalMergeService {
  private readonly mergeService;

  constructor(
    defaultMergeService: StrictPrincipalMergeService,
    @inject(PRINCIPAL_MERGE_SERVICE) @optional() optionalMergeService: PrincipalMergeService | undefined,
  ) {
    this.mergeService = optionalMergeService ?? defaultMergeService;
  }

  mergePrincipals(principals: Principal[]): AuthContext {
    return this.mergeService.mergePrincipals(principals);
  }
}
