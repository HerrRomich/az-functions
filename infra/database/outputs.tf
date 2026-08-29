output "config" {
  value = {
    postgresql_id  = azurerm_postgresql_flexible_server.pg.id
    host           = azurerm_postgresql_flexible_server.pg.fqdn
    database       = azurerm_postgresql_flexible_server_database.fleet_sight.name
    admin_username = azurerm_postgresql_flexible_server.pg.administrator_login
    admin_password = azurerm_postgresql_flexible_server.pg.administrator_password
  }
}

