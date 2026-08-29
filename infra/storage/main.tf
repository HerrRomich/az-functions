locals {
  tags = merge(var.common_tags, {
    "target" = "storage"
  })
}

resource "azurerm_storage_account" "fleet_sight" {
  name                     = "rsmfsexperimentaleuwsa"
  account_replication_type = "ZRS"
  account_tier             = "Standard"
  location                 = var.location
  resource_group_name      = var.resource_group

  tags = local.tags
}

resource "azurerm_storage_container" "functions" {
  name                  = "functions"
  storage_account_id    = azurerm_storage_account.fleet_sight.id
  container_access_type = "private"
}