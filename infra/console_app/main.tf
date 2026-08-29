locals {
  backend_tags = merge(var.common_tags, {
    "resource" = "console-backend"
  })

  frontend_tags = merge(var.common_tags, {
    "resource" = "console-frontend"
  })
}

resource "azurerm_signalr_service" "console_app" {
  name                = "signalr-fleet-sight-${var.resources_suffix}"
  location            = var.location
  resource_group_name = var.resource_group

  sku {
    name     = "Free_F1"
    capacity = 1
  }

  tags = local.backend_tags
}

resource "azurerm_storage_account" "console_backend_storage" {
  name                = "rsmfsexpcbeuwsa"
  resource_group_name = var.resource_group
  location            = var.location

  account_tier             = "Standard"
  account_replication_type = "ZRS"

  tags = local.backend_tags
}

resource "azurerm_storage_container" "code" {
  name                  = "code"
  storage_account_id    = azurerm_storage_account.console_backend_storage.id
  container_access_type = "private"
}

resource "azurerm_storage_blob" "console_backend_code" {
  name                 = "console-backend.zip"
  storage_container_id = azurerm_storage_container.code.id
  type                 = "Block"
  source               = "../packages/examples/backend/dist/console-backend.zip"
  content_md5          = filemd5("../packages/examples/backend/dist/console-backend.zip")
  content_type         = "application/zip"
}

data "azurerm_storage_account_sas" "console_backend_code_sas" {
  connection_string = azurerm_storage_account.console_backend_storage.primary_connection_string
  https_only        = true
  start             = substr(timestamp(), 0, 10)
  expiry            = substr(timeadd(timestamp(), "${2 * 366 * 24}h"), 0, 10)
  resource_types {
    object    = true
    container = false
    service   = false
  }
  services {
    blob  = true
    queue = false
    table = false
    file  = false
  }
  permissions {
    read    = true
    write   = false
    delete  = false
    list    = false
    add     = false
    create  = false
    update  = false
    process = false
    filter  = false
    tag     = false
  }
}

resource "azurerm_service_plan" "console_backend_plan" {
  name                = "fleet-sight-console-backend-plan-${var.resources_suffix}"
  resource_group_name = var.resource_group
  location            = var.location
  os_type             = "Windows"
  sku_name            = "B1"

  tags = local.backend_tags
}

resource "azurerm_subnet" "subnet_console_backend" {
  name                 = "subnet-fleet-sight-${var.resources_suffix}"
  resource_group_name  = var.resource_group
  virtual_network_name = var.vnet_name
  address_prefixes     = ["10.10.1.0/24"]
  delegation {
    name = "flex-delegation"
    service_delegation {
      name = "Microsoft.Web/serverFarms"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action"
      ]
    }
  }
}

resource "azurerm_windows_function_app" "console_backend" {
  name                = "fleet-sight-console-backend-app-${var.resources_suffix}"
  resource_group_name = var.resource_group
  location            = var.location

  service_plan_id            = azurerm_service_plan.console_backend_plan.id
  storage_account_name       = azurerm_storage_account.console_backend_storage.name
  storage_account_access_key = azurerm_storage_account.console_backend_storage.primary_access_key

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"                    = "node"
    "WEBSITE_RUN_FROM_PACKAGE"                    = "${azurerm_storage_blob.console_backend_code.url}${data.azurerm_storage_account_sas.console_backend_code_sas.sas}"
    "AzureWebJobsFeatureFlags"                    = "EnableWorkerIndexing"
    "PersistenceConnectionString"                 = var.persistence.connection_string
    "PersistenceSecureConnection"                 = "false"
    "PersistenceSchema"                           = var.persistence.schema_name
    "EventHubConnection__fullyQualifiedNamespace" = var.eventhub.namespace_fqdn
    "TenantId"                                    = var.tenant_id
    "ApiClientId"                                 = var.api_client_id
    "HASH"                                        = filemd5("../packages/examples/backend/dist/console-backend.zip")
  }

  daily_memory_time_quota     = 0
  builtin_logging_enabled     = false
  functions_extension_version = "~4"
  https_only                  = true

  site_config {
    use_32_bit_worker = false
    ftps_state        = "FtpsOnly"
    always_on         = true

    application_insights_connection_string = var.insights.connection_string
    application_insights_key               = var.insights.instrumentation_key

    application_stack {
      node_version = "~22"
    }
  }

  virtual_network_subnet_id = azurerm_subnet.subnet_console_backend.id
  identity {
    type = "SystemAssigned"
  }

  tags = local.backend_tags

  lifecycle {
    ignore_changes = [
      auth_settings_v2
    ]
  }
}

resource "azurerm_role_assignment" "eventhub_receiver" {
  scope                = var.eventhub.id
  role_definition_name = "Azure Event Hubs Data Receiver"
  principal_id         = azurerm_windows_function_app.console_backend.identity[0].principal_id
}

resource "azurerm_role_assignment" "eventhub_sender" {
  scope                = var.eventhub.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = azurerm_windows_function_app.console_backend.identity[0].principal_id
}

resource "azurerm_static_web_app" "console_frontend" {
  name                = "swa-fleet-sight-console-frontend-${var.resources_suffix}"
  location            = var.location
  resource_group_name = var.resource_group
  sku_tier            = "Standard"
  sku_size            = "Standard"

  tags = local.frontend_tags
}

resource "azurerm_static_web_app_function_app_registration" "console_frontend_api_registration" {
  static_web_app_id = azurerm_static_web_app.console_frontend.id
  function_app_id   = azurerm_windows_function_app.console_backend.id
}
