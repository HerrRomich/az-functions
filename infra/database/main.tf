terraform {
  required_providers {
    azurerm = {
      source = "hashicorp/azurerm"
    }
  }
}

locals {
  tags = merge(var.common_tags, {
    "resource" = "database"
  })
}

resource "azurerm_postgresql_flexible_server" "pg" {
  name                          = "pg-flex-server-fleet-sight-${var.resources_suffix}"
  resource_group_name           = var.resource_group
  location                      = var.location
  version                       = "18"
  administrator_login           = "pgadminuser"
  administrator_password        = var.postgresql_admin_password
  public_network_access_enabled = true
  zone                          = "1"

  sku_name                     = "B_Standard_B1ms"
  storage_mb                   = 32768
  storage_tier                 = "P4"
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false

  tags = local.tags
}

resource "azurerm_postgresql_flexible_server_configuration" "pg_config" {
  server_id = azurerm_postgresql_flexible_server.pg.id
  name      = "azure.extensions"
  value     = "postgis"
}

resource "azurerm_postgresql_flexible_server_database" "fleet_sight" {
  charset   = "UTF8"
  collation = "de_DE.utf8"
  name      = "fleet_sight"
  server_id = azurerm_postgresql_flexible_server.pg.id
}

resource "azurerm_postgresql_flexible_server_firewall_rule" "local_ips" {
  for_each = var.firewall_ip_addresses

  name = "${each.key}-access"

  server_id        = azurerm_postgresql_flexible_server.pg.id
  start_ip_address = each.value
  end_ip_address   = each.value
}

resource "azurerm_private_dns_zone" "postgresql_dns_zone" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group
  tags                = local.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgresql_dns_link" {
  name                = "postgresql-dns-link"
  private_dns_zone_id = azurerm_private_dns_zone.postgresql_dns_zone.id
  virtual_network_id  = var.vnet.id

  tags = local.tags
}

resource "azurerm_subnet" "postgresql_subnet" {
  name                 = "private-endpoints"
  resource_group_name  = var.resource_group
  virtual_network_name = var.vnet.name
  address_prefixes     = ["10.10.2.0/24"]
}

resource "azurerm_private_endpoint" "postgresql_private_endpoint" {
  name                = "postgresql-private-endpoint"
  resource_group_name = var.resource_group
  location            = var.location
  subnet_id           = azurerm_subnet.postgresql_subnet.id

  private_service_connection {
    name                           = "${azurerm_postgresql_flexible_server.pg.name}-psc"
    is_manual_connection           = false
    private_connection_resource_id = azurerm_postgresql_flexible_server.pg.id
    subresource_names              = ["postgresqlServer"]
  }
  private_dns_zone_group {
    name = "postgresql-dns-zone-group"
    private_dns_zone_ids = [
      azurerm_private_dns_zone.postgresql_dns_zone.id
    ]
  }

  tags = local.tags
}
