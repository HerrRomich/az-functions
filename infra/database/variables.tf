variable "resource_group" {
  type        = string
  description = "Resource Group Name where all resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where resources will be created"
}

variable "resources_suffix" {
  type        = string
  description = "Suffix to be appended to resource names to ensure uniqueness"
}

variable "postgresql_admin_password" {
  type        = string
  description = "Administrator password for PostgreSQL Flexible Server"
  sensitive   = true
}

variable "vnet" {
  type = object({
    id   = string
    name = string
  })
}

variable "firewall_ip_addresses" {
  type        = map(string)
  description = "List of local IP addresses that require access to the PostgreSQL Flexible Server instance, used for configuring firewall rules"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}
