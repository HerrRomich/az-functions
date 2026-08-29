variable "postgresql" {
  type = object({
    id             = string
    host           = string
    port           = number
    database       = string
    admin_username = string
    admin_password = string
  })
  description = "Configuration for connecting to the PostgreSQL Flexible Server instance, including host, port, database name, administrator username, and administrator password"
}

variable "postgresql_fleet_sight_password" {
  type        = string
  description = "Password for the fleet_sight database role"
}
