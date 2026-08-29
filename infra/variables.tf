variable "subscription_id" {
  type        = string
  description = "Azure Subscription ID where resources will be created"
}

variable "resource_group" {
  type        = string
  description = "Resource Group Name where all resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where resources will be created"
}

variable "amr_location" {
  type        = string
  description = "Azure region where Azure Managed Redis will be created"
  default     = null
}

variable "amr_datahub_sku" {
  type    = string
  default = "Balanced_B0"
}

variable "amr_datahub_ha_enabled" {
  type    = bool
  default = false
}

variable "resources_suffix" {
  type        = string
  description = "Suffix to be appended to resource names to ensure uniqueness"
}

variable "client_id" {
  type        = string
  description = "Client ID of the Service Principal with sufficient permissions to create resources"
}

variable "client_secret" {
  type        = string
  description = "Client Secret of the Service Principal"
  sensitive   = true
}

variable "tenant_id" {
  type        = string
  description = "Azure Tenant ID associated with the Subscription"
}

variable "api_client_id" {
  type        = string
  description = "Azure Active Directory Application Registration client ID for the Console App, used for authentication and authorization"
}

variable "postgresql_admin_password" {
  type        = string
  description = "Administrator password for PostgreSQL Flexible Server"
  sensitive   = true
}

variable "postgresql_fleet_sight_password" {
  type        = string
  description = "Password for the fleet_sight database role"
}

variable "dev_ip_addresses" {
  type        = map(string)
  description = "List of local IP addresses that require access to the PostgreSQL Flexible Server instance, used for configuring firewall rules"
  default     = {}
}

variable "dev_principals" {
  type        = map(string)
  description = "A map of developer principal name to object id, used for granting access to resources"
  default     = {}
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}
