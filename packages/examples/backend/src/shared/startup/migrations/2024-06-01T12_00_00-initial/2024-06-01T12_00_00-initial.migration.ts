import { injectable } from 'inversify';
import { Kysely, sql } from 'kysely';
import { INITIAL_LOCATIONS } from 'shared/startup/migrations/2024-06-01T12_00_00-initial/locations.data';
import { stringsToKey, stringToBucket, stringToHashString } from 'shared/utils';
import { IFleetSightMigration } from '../../migration.model';
import { INITIAL_DRIVERS } from './drivers.data';
import { INITIAL_TRUCKS } from './trucks.data';

@injectable()
export class InitialMigration implements IFleetSightMigration {
  name = '2025-12-05T07:37:00.initial.migration';

  async up(db: Kysely<unknown>): Promise<void> {
    // Fleet management initial migration

    // Create 'truck' table
    await db.schema
      .createTable('truck')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('license_plate', 'varchar(25)', col => col.notNull())
      .addColumn('model', 'varchar(250)', col => col.notNull())
      .addColumn('location', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('speed', 'decimal', col => col.notNull())
      .addColumn('acceleration', 'decimal', col => col.notNull())
      .addColumn('fuel_level', 'decimal', col => col.notNull())
      .addColumn('run', 'integer')
      .addPrimaryKeyConstraint('truck_pk', ['id'])
      .addUniqueConstraint('truck_licence_plate_uk', ['license_plate'])
      .execute();
    await db.schema.createIndex('idx_truck_location').on('truck').columns(['location']).execute();
    await db.schema.createIndex('idx_truck_run').on('truck').columns(['run']).execute();

    // Create 'driver' table
    await db.schema
      .createTable('driver')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('name', 'varchar(100)', col => col.notNull())
      .addColumn('surname', 'varchar(100)', col => col.notNull())
      .addColumn('date_of_birth', 'date', col => col)
      .addColumn('license_number', 'varchar(50)', col => col.notNull())
      .addColumn('phone_number', 'varchar(20)', col => col.notNull())
      .addColumn('email', 'varchar(100)', col => col.notNull())
      .addColumn('run', 'integer')
      .addPrimaryKeyConstraint('driver_pk', ['id'])
      .addUniqueConstraint('driver_license_number_uk', ['license_number'])
      .addUniqueConstraint('driver_name_surname_birth_uk', ['name', 'surname', 'date_of_birth'])
      .addUniqueConstraint('driver_email_uk', ['email'])
      .execute();
    await db.schema
      .createIndex('idx_driver_run')
      .on('driver')
      .columns(['run'])

      .execute();

    // Create 'truck-run' table
    await db.schema
      .createTable('truck_run')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('truck_id', 'integer', col => col.notNull())
      .addColumn('driver_id', 'integer', col => col.notNull())
      .addColumn('destination_address', 'varchar(250)', col => col.notNull())
      .addColumn('destination_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('type', 'varchar(50)', col => col.notNull())
      .addColumn('order_id', 'integer')
      .addPrimaryKeyConstraint('truck_run_pk', ['id'])
      .execute();
    await db.schema.createIndex('idx_truck_run_truck_id').on('truck_run').columns(['truck_id']).execute();
    await db.schema.createIndex('idx_truck_run_driver_id').on('truck_run').columns(['driver_id']).execute();

    await db.schema
      .alterTable('truck_run')
      .addForeignKeyConstraint('fk_truck_run_truck', ['truck_id'], 'truck', ['id'])
      .execute();
    await db.schema
      .alterTable('truck_run')
      .addForeignKeyConstraint('fk_truck_run_driver', ['driver_id'], 'driver', ['id'])
      .execute();
    await db.schema.alterTable('truck').addForeignKeyConstraint('fk_truck_run', ['run'], 'truck_run', ['id']).execute();
    await db.schema
      .alterTable('driver')
      .addForeignKeyConstraint('fk_driver_run', ['run'], 'truck_run', ['id'])
      .execute();

    // Order management initial migration
    // Create 'customer' table
    await db.schema
      .createTable('customer')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('name', 'varchar(100)', col => col.notNull())
      .addColumn('email', 'varchar(100)', col => col.notNull())
      .addColumn('phone_number', 'varchar(20)', col => col.notNull())
      .addPrimaryKeyConstraint('customer_pk', ['id'])
      .execute();

    // Create 'order' table
    await db.schema
      .createTable('order')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('customer_id', 'integer', col => col.notNull())
      .addColumn('source_address', 'varchar(250)', col => col.notNull())
      .addColumn('source_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('destination_address', 'varchar(250)', col => col.notNull())
      .addColumn('destination_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('weight', 'decimal', col => col.notNull())
      .addColumn('capacity', 'decimal', col => col.notNull())
      .addColumn('status', 'varchar(50)', col => col.notNull())
      .addPrimaryKeyConstraint('order_pk', ['id'])
      .execute();
    await db.schema.createIndex('idx_order_customer_id').on('order').columns(['customer_id']).execute();

    await db.schema
      .alterTable('order')
      .addForeignKeyConstraint('fk_order_customer', ['customer_id'], 'customer', ['id'])
      .execute();

    await db.schema
      .createTable('locations')
      .addColumn('id', 'serial', col => col.notNull())
      .addColumn('customer_id', 'integer', col => col.notNull())
      .addColumn('post_code', 'varchar(250)', col => col.notNull())
      .addColumn('city', 'varchar(250)', col => col.notNull())
      .addColumn('street', 'varchar(250)', col => col.notNull())
      .addColumn('house_number', 'varchar(50)', col => col.notNull())
      .addColumn('point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addPrimaryKeyConstraint('locations_pk', ['id'])
      .execute();
    await db.schema.createIndex('idx_locations_customer_id').on('locations').columns(['customer_id']).execute();
    await db.schema.createIndex('idx_locations_point').on('locations').columns(['point']).execute();

    await db.schema
      .alterTable('locations')
      .addForeignKeyConstraint('fk_locations_customer', ['customer_id'], 'customer', ['id'])
      .execute();

    // Insert initial data
    const trucks = INITIAL_TRUCKS.map(
      truck => `
      ('${truck.licensePlate}', '${truck.model}', public.ST_SetSRID(public.ST_MakePoint(${truck.longitude}, ${truck.latitude}), 4326), 0, 0, 100)`,
    ).join(',');

    // Insert initial trucks
    await db.executeQuery(
      sql`insert into truck (license_plate, model, location, speed, acceleration, fuel_level)
                              values ${sql.raw(trucks)};`.compile(db),
    );

    const startBirthDate = new Date('1970-01-01').getTime();
    const endBirthDate = new Date('2000-01-01').getTime();
    const milisBetween = endBirthDate - startBirthDate;

    // insert initial drivers
    const drivers = INITIAL_DRIVERS.map(driver => {
      const driverKey = stringsToKey(driver.name, driver.surname);
      const birthDate = new Date(startBirthDate + stringToBucket(driverKey, milisBetween, 'birthdate'))
        .toISOString()
        .split('T')[0];
      const license = `LN${stringToHashString(driverKey, 12, 'license')}`;
      const phoneNumber = `+49${stringToHashString(driverKey, 10, 'phone_number')}`;
      const email = `${driver.name.toLowerCase()}.${driver.surname.toLowerCase().replace("'", '_')}@@logi-fleet.de`;
      return `('${driver.name}', '${driver.surname.replace("'", "''")}', '${birthDate}', '${license}', '${phoneNumber}', '${email}')`;
    }).join(',');
    await db.executeQuery(
      sql`insert into driver (name, surname, date_of_birth, license_number, phone_number, email)
                              values ${sql.raw(drivers)};`.compile(db),
    );

    // insert initial customers
    const customers = Array.from({ length: 20 }, (_, i) => ({
      name: `Customer${i + 1}`,
      email: `contact@customer${i + 1}.de`,
      phone_number: `+49891234${(56 + i).toString().padStart(2, '0')}`,
    }))
      .map(
        customer => `
      ('${customer.name}', '${customer.email}', '${customer.phone_number}')`,
      )
      .join(',');
    await db.executeQuery(
      sql`insert into customer (name, email, phone_number) values ${sql.raw(customers)};`.compile(db),
    );

    // insert initial locations
    const locations = INITIAL_LOCATIONS.features
      .map(location => {
        const props = location.properties;
        const adressKey = stringsToKey(props.postcode, props.city, props.street, props.housenumber);
        const customerId = stringToBucket(adressKey, 20, 'customer_id') + 1;
        const [longitude, latitude] = location.geometry.coordinates;
        return `
        (${customerId}, '${props.postcode}', '${props.city}', '${props.street}', '${props.housenumber}',
        public.ST_SetSRID(public.ST_MakePoint(${longitude}, ${latitude}), 4326))`;
      })
      .join(',');
    await db.executeQuery(
      sql`insert into locations (customer_id, post_code, city, street, house_number, point)
                              values ${sql.raw(locations)};`.compile(db),
    );
  }
}
