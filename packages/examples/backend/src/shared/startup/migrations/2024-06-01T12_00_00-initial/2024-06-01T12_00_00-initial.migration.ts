import { injectable } from 'inversify';
import { Kysely, QueryResult, sql } from 'kysely';
import { HashUtilitiesService } from '../../../utils';
import { IFleetSightMigration } from '../../migration.model';
import { INITIAL_DRIVERS } from './drivers.data';
import { INITIAL_LOCATIONS } from './locations.data';
import { INITIAL_TRUCKS } from './trucks.data';

@injectable()
export class InitialMigration implements IFleetSightMigration {
  name = '2025-12-05T07:37:00.initial.migration';

  constructor(private readonly hashUtilitiesService: HashUtilitiesService) {}

  async up(db: Kysely<unknown>): Promise<void> {
    // Fleet management initial migration

    // Create 'truck' table
    await db.schema
      .createTable('truck')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('license_plate', 'varchar(25)', col => col.notNull())
      .addColumn('model', 'varchar(250)', col => col.notNull())
      .addColumn('location', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('speed', 'decimal', col => col.notNull())
      .addColumn('acceleration', 'decimal', col => col.notNull())
      .addColumn('fuel_level', 'decimal', col => col.notNull())
      .addColumn('run_id', 'uuid')
      .addPrimaryKeyConstraint('truck_pk', ['id'])
      .addUniqueConstraint('truck_licence_plate_uk', ['license_plate'])
      .execute();
    await db.schema.createIndex('truck_location_idx').on('truck').columns(['location']).execute();
    await db.schema.createIndex('truck_run_idx').on('truck').columns(['run_id']).execute();

    // Create 'driver' table
    await db.schema
      .createTable('driver')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('name', 'varchar(100)', col => col.notNull())
      .addColumn('surname', 'varchar(100)', col => col.notNull())
      .addColumn('date_of_birth', 'date', col => col)
      .addColumn('license_number', 'varchar(50)', col => col.notNull())
      .addColumn('phone_number', 'varchar(20)', col => col.notNull())
      .addColumn('email', 'varchar(100)', col => col.notNull())
      .addColumn('run_id', 'uuid')
      .addPrimaryKeyConstraint('driver_pk', ['id'])
      .addUniqueConstraint('driver_license_number_uk', ['license_number'])
      .addUniqueConstraint('driver_name_surname_birth_uk', ['name', 'surname', 'date_of_birth'])
      .addUniqueConstraint('driver_email_uk', ['email'])
      .execute();
    await db.schema.createIndex('driver_run_idx').on('driver').columns(['run_id']).execute();

    // Create 'truck-run' table
    await db.schema
      .createTable('truck_run')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('truck_id', 'uuid', col => col.notNull())
      .addColumn('driver_id', 'uuid', col => col.notNull())
      .addColumn('destination_address', 'varchar(250)', col => col.notNull())
      .addColumn('destination_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('type', 'varchar(50)', col => col.notNull())
      .addColumn('order_id', 'uuid')
      .addPrimaryKeyConstraint('truck_run_pk', ['id'])
      .execute();
    await db.schema.createIndex('truck_run_truck_id_idx').on('truck_run').columns(['truck_id']).execute();
    await db.schema.createIndex('truck_run_driver_id_idx').on('truck_run').columns(['driver_id']).execute();

    await db.schema
      .alterTable('truck_run')
      .addForeignKeyConstraint('truck_run_truck_fk', ['truck_id'], 'truck', ['id'])
      .execute();
    await db.schema
      .alterTable('truck_run')
      .addForeignKeyConstraint('truck_run_driver_fk', ['driver_id'], 'driver', ['id'])
      .execute();
    await db.schema
      .alterTable('truck')
      .addForeignKeyConstraint('truck_run_fk', ['run_id'], 'truck_run', ['id'])
      .execute();
    await db.schema
      .alterTable('driver')
      .addForeignKeyConstraint('driver_run_fk', ['run_id'], 'truck_run', ['id'])
      .execute();

    // OrderWithCustomer management initial migration
    // Create 'customer' table
    await db.schema
      .createTable('customer')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('name', 'varchar(100)', col => col.notNull())
      .addColumn('email', 'varchar(100)', col => col.notNull())
      .addColumn('phone_number', 'varchar(20)', col => col.notNull())
      .addPrimaryKeyConstraint('customer_pk', ['id'])
      .execute();

    // Create 'order' table
    await db.schema
      .createTable('order')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('customer_id', 'uuid', col => col.notNull())
      .addColumn('source_address', 'varchar(250)', col => col.notNull())
      .addColumn('source_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('destination_address', 'varchar(250)', col => col.notNull())
      .addColumn('destination_point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addColumn('weight', 'decimal', col => col.notNull())
      .addColumn('volume', 'decimal', col => col.notNull())
      .addColumn('scheduled_at', 'timestamp')
      .addColumn('status', 'varchar(50)', col => col.notNull())
      .addColumn('truck_run_id', 'uuid')
      .addPrimaryKeyConstraint('order_pk', ['id'])
      .execute();
    await db.schema.createIndex('order_customer_id_idx').on('order').columns(['customer_id']).execute();

    await db.schema
      .alterTable('order')
      .addForeignKeyConstraint('order_customer_fk', ['customer_id'], 'customer', ['id'])
      .execute();
    await db.schema
      .alterTable('order')
      .addForeignKeyConstraint('order_truck_run_fk', ['truck_run_id'], 'truck_run', ['id'])
      .execute();

    await db.schema
      .createTable('locations')
      .addColumn('id', 'uuid', col => col.notNull().defaultTo(sql`uuidv7()`))
      .addColumn('customer_id', 'uuid', col => col.notNull())
      .addColumn('post_code', 'varchar(250)', col => col.notNull())
      .addColumn('city', 'varchar(250)', col => col.notNull())
      .addColumn('street', 'varchar(250)', col => col.notNull())
      .addColumn('house_number', 'varchar(50)', col => col.notNull())
      .addColumn('point', sql`public.geometry(POINT,4326)`, col => col.notNull())
      .addPrimaryKeyConstraint('locations_pk', ['id'])
      .execute();
    await db.schema.createIndex('locations_customer_id_idx').on('locations').columns(['customer_id']).execute();
    await db.schema.createIndex('locations_point_idx').on('locations').columns(['point']).execute();

    await db.schema
      .alterTable('locations')
      .addForeignKeyConstraint('locations_customer', ['customer_id'], 'customer', ['id'])
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
    const millisBetween = endBirthDate - startBirthDate;

    // insert initial drivers
    const drivers = INITIAL_DRIVERS.map(driver => {
      const driverKey = this.hashUtilitiesService.stringsToKey(driver.name, driver.surname);
      const birthDate = new Date(
        startBirthDate + this.hashUtilitiesService.stringToBucket(driverKey, millisBetween, 'birthdate'),
      )
        .toISOString()
        .split('T')[0];
      const license = `LN${this.hashUtilitiesService.stringToHashString(driverKey, 12, 'license')}`;
      const phoneNumber = `+49${this.hashUtilitiesService.stringToHashString(driverKey, 10, 'phone_number')}`;
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
    const { rows: customerIds } = (await db.executeQuery(
      sql`insert into customer (name, email, phone_number) values ${sql.raw(customers)} returning id;`.compile(db),
    )) as QueryResult<{ id: string }>;

    // insert initial locations
    const locations = INITIAL_LOCATIONS.features
      .map(location => {
        const props = location.properties;
        const adressKey = this.hashUtilitiesService.stringsToKey(
          props.postcode,
          props.city,
          props.street,
          props.housenumber,
        );
        const customerPosition = this.hashUtilitiesService.stringToBucket(adressKey, 20, 'customer_id');
        const customerId = customerIds[customerPosition]!.id;
        const [longitude, latitude] = location.geometry.coordinates;
        return `
        ('${customerId}', '${props.postcode}', '${props.city}', '${props.street}', '${props.housenumber}',
        public.ST_SetSRID(public.ST_MakePoint(${longitude}, ${latitude}), 4326))`;
      })
      .join(',');
    await db.executeQuery(
      sql`insert into locations (customer_id, post_code, city, street, house_number, point)
                              values ${sql.raw(locations)};`.compile(db),
    );
  }
}
