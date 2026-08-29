terraform {
  required_version = ">= 1.0.0" # Ensure that the Terraform version is 1.0.0 or higher

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "5.3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "3.9.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "1.27.0"
    }
    curl = {
      source  = "anschoewe/curl"
      version = "1.0.2"
    }
    azapi = {
      source  = "Azure/azapi"
      version = "=2.12.0"
    }
  }
}

provider "azurerm" {
  resource_provider_registrations = "none"
  features {}
  subscription_id = var.subscription_id
  client_id       = var.client_id
  tenant_id       = var.tenant_id
  client_secret   = var.client_secret
}

provider "azuread" {
  client_id     = var.client_id
  tenant_id     = var.tenant_id
  client_secret = var.client_secret
}

provider "curl" {}

data "curl" "local_ip" {
  http_method = "GET"
  uri         = "https://api.ipify.org?format=json"
}

locals {
  amr_location = coalesce(var.amr_location, var.location)
  dev_ip_addresses = merge(var.dev_ip_addresses, {
    "local" = jsondecode(data.curl.local_ip.response).ip
  })
}

resource "azurerm_resource_group" "fleet_sight" {
  location = var.location
  name     = var.resource_group

  tags = var.common_tags
}

resource "azurerm_virtual_network" "vnet" {
  name                = "vnet-fleet-sight-${var.resources_suffix}"
  location            = var.location
  resource_group_name = azurerm_resource_group.fleet_sight.name
  address_space       = ["10.10.0.0/16"]

  tags       = var.common_tags
  depends_on = [azurerm_resource_group.fleet_sight]
}

resource "azurerm_log_analytics_workspace" "insights_workspace" {
  name                = "la-fleet-sight-${var.resources_suffix}"
  resource_group_name = azurerm_resource_group.fleet_sight.name
  location            = var.location

  tags = var.common_tags
}

resource "azurerm_application_insights" "insights" {
  name                = "ai-fleet_sight-${var.resources_suffix}"
  resource_group_name = azurerm_resource_group.fleet_sight.name
  location            = var.location
  workspace_id        = azurerm_log_analytics_workspace.insights_workspace.id
  application_type    = "web"


  tags = var.common_tags
}

module "database" {
  source = "./database"

  resource_group        = azurerm_resource_group.fleet_sight.name
  location              = var.location
  resources_suffix      = var.resources_suffix
  firewall_ip_addresses = local.dev_ip_addresses
  vnet = {
    id   = azurerm_virtual_network.vnet.id
    name = azurerm_virtual_network.vnet.name
  }
  postgresql_admin_password = var.postgresql_admin_password

  common_tags = var.common_tags

  providers = {
    azurerm = azurerm,
  }
}

provider "postgresql" {
  host            = module.database.config.host
  port            = 5432
  database        = module.database.config.database
  username        = module.database.config.admin_username
  password        = module.database.config.admin_password
  superuser       = false
  sslmode         = "require"
  connect_timeout = 15


}

module "persistence" {
  source = "./persistence"

  providers = {
    postgresql = postgresql,
  }

  postgresql = {
    id             = module.database.config.postgresql_id
    host           = module.database.config.host
    port           = 5432
    database       = module.database.config.database
    admin_username = module.database.config.admin_username
    admin_password = module.database.config.admin_password
  }
  postgresql_fleet_sight_password = var.postgresql_fleet_sight_password

  depends_on = [module.database]
}

module "cache" {
  source = "./cache"

  resource_group   = azurerm_resource_group.fleet_sight.name
  location         = var.location
  resources_suffix = var.resources_suffix
  common_tags      = var.common_tags

  amr_location           = local.amr_location
  amr_datahub_sku        = var.amr_datahub_sku
  amr_datahub_ha_enabled = var.amr_datahub_ha_enabled
}

module "eventhub" {
  source = "./eventhub"

  resource_group           = azurerm_resource_group.fleet_sight.name
  location                 = var.location
  resources_suffix         = var.resources_suffix
  dev_principal_object_ids = [for principal in values(var.dev_principals) : principal]
  common_tags              = var.common_tags
}

locals {
  pg_connection_string = "postgresql://${module.persistence.role_name}:${var.postgresql_fleet_sight_password}@${module.database.config.host}:${5432}/${module.database.config.database}?sslmode=require"
}

module "console_app" {
  source = "./console_app"

  resource_group   = azurerm_resource_group.fleet_sight.name
  location         = var.location
  tenant_id        = var.tenant_id
  api_client_id    = var.api_client_id
  resources_suffix = var.resources_suffix
  common_tags      = var.common_tags
  insights = {
    connection_string   = azurerm_application_insights.insights.connection_string
    instrumentation_key = azurerm_application_insights.insights.instrumentation_key
  }
  persistence = {
    postgresql_id     = module.database.config.postgresql_id
    connection_string = local.pg_connection_string
    schema_name       = module.persistence.schema_name
  }
  eventhub = {
    id             = module.eventhub.config.eventhub_id
    namespace_fqdn = module.eventhub.config.eventhub_fqdn
  }
  vnet_name = azurerm_virtual_network.vnet.name
}
