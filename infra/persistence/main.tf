terraform {
  required_providers {
    postgresql = {
      source = "cyrilgdn/postgresql"
    }
  }
}

resource "postgresql_role" "fleet_sight_role" {
  name     = "fleet_sight"
  login    = true
  password = var.postgresql_fleet_sight_password
}

resource "postgresql_schema" "fleet_sight_schema" {
  name  = "fleet_sight"
  owner = postgresql_role.fleet_sight_role.name
}

resource "postgresql_grant" "fleet_sight_role_database" {
  database    = var.postgresql.database
  role        = postgresql_role.fleet_sight_role.name
  schema      = postgresql_schema.fleet_sight_schema.name
  object_type = "database"
  privileges = [
    "CONNECT"
  ]
}

resource "postgresql_extension" "postgis" {
  name     = "postgis"
  database = var.postgresql.database
}
