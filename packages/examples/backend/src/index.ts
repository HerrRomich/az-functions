import './init';

import { startPlatform } from '@herrromich/az-functions';
import { persistenceModule } from 'shared/persistence';
import { securityModule } from 'shared/security';
import { startupModule } from 'shared/startup';
import { consoleApiModule } from './apis';
import { platformContainer } from './platform-container';

await platformContainer.load(persistenceModule, startupModule, securityModule, consoleApiModule);

await startPlatform(platformContainer);

console.log('Azure Functions backend started.');
