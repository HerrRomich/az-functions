output "config" {
  value = {
    eventhub_id   = azurerm_eventhub_namespace.fleet-sight.id
    eventhub_fqdn = "${azurerm_eventhub_namespace.fleet-sight.name}.servicebus.windows.net"
  }
}

