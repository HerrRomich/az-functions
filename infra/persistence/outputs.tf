output "role_name" {
  value = postgresql_role.fleet_sight_role.name
}

output "schema_name" {
  value = postgresql_schema.fleet_sight_schema.name
}
