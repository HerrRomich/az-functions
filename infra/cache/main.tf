terraform {
  required_providers {
    azapi = {
      source = "Azure/azapi"
    }
  }
}

locals {
  cache_tags = merge(var.common_tags, {
    "resource" = "redis-cache"
  })
}

resource "azurerm_managed_redis" "amr_fleet_sight" {
  name                      = "amr-fleet-sight-${var.resources_suffix}"
  location                  = var.amr_location
  resource_group_name       = var.resource_group
  sku_name                  = var.amr_datahub_sku
  high_availability_enabled = var.amr_datahub_ha_enabled
  public_network_access     = "Enabled"

  default_database {
    access_keys_authentication_enabled          = false
    eviction_policy                             = "VolatileLRU"
    client_protocol                             = "Encrypted"
    persistence_redis_database_backup_frequency = var.amr_datahub_ha_enabled ? "1h" : null
  }

  tags = local.cache_tags

  timeouts {
    create = "90m"
  }

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      sku_name
    ]
  }
}
