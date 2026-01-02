variable SUBSCRIPTION_ID {
  type = string
  description = "Azure Subscription ID where resources will be created"
}

variable "RESOURCE_GROUP" {
  type = string
  description = "Resource Group Name where all resources will be created"
}

variable "LOCATION" {
  type = string
  description = "Azure region where resources will be created"
}

variable "CLIENT_ID" {
  type = string
  description = "Client ID of the Service Principal with sufficient permissions to create resources"
}

variable "CLIENT_SECRET" {
  type      = string
  description = "Client Secret of the Service Principal"
  sensitive = true
}

variable "TENANT_ID" {
  type = string
  description = "Azure Tenant ID associated with the Subscription"
}