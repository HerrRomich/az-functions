locals {
  eventhub_tags = merge(var.common_tags, {
    "resource" = "event-hub"
  })
}

resource "azurerm_eventhub_namespace" "fleet-sight" {
  name                = "evhns-fleet-sight-${var.resources_suffix}"
  location            = var.location
  resource_group_name = var.resource_group
  sku                 = "Basic"
  capacity            = 1

  tags = local.eventhub_tags
}

resource "azurerm_eventhub" "fleet-sight" {
  name              = "evh-fleet-sight"
  namespace_id      = azurerm_eventhub_namespace.fleet-sight.id
  partition_count   = 2
  message_retention = 1
}

resource "azurerm_role_assignment" "eventhub_receiver" {
  for_each             = var.dev_principal_object_ids
  scope                = azurerm_eventhub.fleet-sight.id
  role_definition_name = "Azure Event Hubs Data Receiver"
  principal_id         = each.value
}

resource "azurerm_role_assignment" "eventhub_sender" {
  for_each             = var.dev_principal_object_ids
  scope                = azurerm_eventhub.fleet-sight.id
  role_definition_name = "Azure Event Hubs Data Sender"
  principal_id         = each.value
}

resource "azurerm_eventhub_authorization_rule" "fleet-sight" {
  name                = "evh-auth-fleet-sight"
  namespace_name      = azurerm_eventhub_namespace.fleet-sight.name
  eventhub_name       = azurerm_eventhub.fleet-sight.name
  resource_group_name = var.resource_group

  listen = true
  send   = true
  manage = false
}
