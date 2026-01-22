import { mock } from 'jest-mock-extended';
import { IFleetSightMigration } from 'shared/startup/migration.model';
import { FleetSightMigrationProvider } from './migration.provider';

describe('Migration provider', () => {
  let mockMigration1: IFleetSightMigration;
  let mockMigration2: IFleetSightMigration;
  let mockMigration3: IFleetSightMigration;
  let subject: FleetSightMigrationProvider;

  beforeEach(() => {
    mockMigration1 = mock<IFleetSightMigration>({
      name: '001_migration_one',
    });
    mockMigration2 = mock<IFleetSightMigration>({
      name: '002_migration_two',
    });
    mockMigration3 = mock<IFleetSightMigration>({
      name: '003_migration_three',
    });
    subject = new FleetSightMigrationProvider([mockMigration1, mockMigration2, mockMigration3]);
  });

  describe('getMigrations', () => {
    it('should return migrations mapped by their names', async () => {
      const migrations = await subject.getMigrations();

      expect(migrations).toEqual({
        '001_migration_one': expect.anything(),
        '002_migration_two': expect.anything(),
        '003_migration_three': expect.anything(),
      });
      const migrationOneUp = migrations['001_migration_one']!.up;
      const migrationOneDown = migrations['001_migration_one']!.down;
      const migrationTwoUp = migrations['002_migration_two']!.up;
      const migrationTwoDown = migrations['002_migration_two']!.down;
      const migrationThreeUp = migrations['003_migration_three']!.up;
      const migrationThreeDown = migrations['003_migration_three']!.down;

      // Verify that the up methods call the corresponding migration's up method
      await migrationOneUp({} as any);
      expect(mockMigration1.up).toHaveBeenCalledWith({} as any);

      await migrationTwoUp({} as any);
      expect(mockMigration2.up).toHaveBeenCalledWith({} as any);

      await migrationThreeUp({} as any);
      expect(mockMigration3.up).toHaveBeenCalledWith({} as any);

      // Verify that the down methods call the corresponding migration's down method, if defined
      if (migrationOneDown) {
        await migrationOneDown({} as any);
        expect(mockMigration1.down).toHaveBeenCalledWith({} as any);
      } else {
        expect(mockMigration1.down).toBeUndefined();
      }

      if (migrationTwoDown) {
        await migrationTwoDown({} as any);
        expect(mockMigration2.down).toHaveBeenCalledWith({} as any);
      } else {
        expect(mockMigration2.down).toBeUndefined();
      }
      if (migrationThreeDown) {
        await migrationThreeDown({} as any);
        expect(mockMigration3.down).toHaveBeenCalledWith({} as any);
      } else {
        expect(mockMigration3.down).toBeUndefined();
      }
    });
  });
});
