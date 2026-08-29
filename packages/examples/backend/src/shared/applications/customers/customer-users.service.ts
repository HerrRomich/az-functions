import { injectable } from 'inversify';

@injectable()
export class CustomerUsersService {
  async getCustomersForUser(_userId: string): Promise<Record<string, boolean>> {
    return {
      '019bf535-c3dd-76a6-8540-65f886139468': true,
      '019bf535-c3dd-776c-94b4-46fc34283313': true,
      '019bf535-c3dd-779f-81d1-9d454d19ae17': true,
    };
  }
}
