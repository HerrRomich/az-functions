import { ContainerModule } from 'inversify';
import * as path from 'path';
import { ZodFirstPartyTypeKind, ZodType } from 'zod';
import { BASE_DIR } from './platform.model';
import { SYSTEM_USER_ACCOUNT, systemUserAccount } from './security.model';

export * from './decorators';
export * from './platform-context-local-storage';
export * from './platform.model';
export * from './security.model';

export const sharedModule = new ContainerModule((bind) => {
  bind(BASE_DIR).toConstantValue(path.resolve(__dirname, '.'));
  bind(SYSTEM_USER_ACCOUNT).toConstantValue(systemUserAccount);
});

export function zodTypeName(schema: ZodType): ZodFirstPartyTypeKind {
  return (schema._def as any).typeName;
}
