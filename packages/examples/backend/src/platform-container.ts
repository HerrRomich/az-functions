import { Container } from 'inversify';

export const platformContainer = new Container({
  defaultScope: 'Singleton',
});
