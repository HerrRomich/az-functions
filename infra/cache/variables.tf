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
  description = "Location for Azure Managed Redis"
}

variable "amr_datahub_sku" {
  type = string
}

variable "amr_datahub_ha_enabled" {
  type = bool
}

variable "resources_suffix" {
  type        = string
  description = "Suffix to be appended to resource names to ensure uniqueness"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}
