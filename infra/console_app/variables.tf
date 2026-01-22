variable "resource_group" {
  type        = string
  description = "Resource Group Name where all resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where resources will be created"
}

variable "tenant_id" {
  type        = string
  description = "Azure Active Directory Tenant ID for the subscription"
}

variable "api_client_id" {
  type        = string
  description = "Azure Active Directory Application Registration client ID for the Console App, used for authentication and authorization"
}

variable "resources_suffix" {
  type        = string
  description = "Suffix to be appended to resource names to ensure uniqueness"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}

variable "insights" {
  type = object({
    connection_string   = string
    instrumentation_key = string
  })
}

variable "eventhub" {
  type = object({
    id             = string
    namespace_fqdn = string
  })
}

variable "persistence" {
  type = object({
    connection_string = string
    schema_name       = string
  })
}

variable "vnet_name" {
  type        = string
  description = "Name of the existing Virtual Network to which the Console App will be connected"
}
