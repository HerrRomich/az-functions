import { ContainerModule } from 'inversify';
import { HashUtilitiesService } from './hash-utilities.service';

export * from './data-utilities.model';
export * from './hash-utilities.service';
export * from './object-utilities';

export const UtilitiesModule = new ContainerModule(({ bind }) => {
  bind(HashUtilitiesService).toSelf();
});
