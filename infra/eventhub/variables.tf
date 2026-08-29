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

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}

variable "dev_principal_object_ids" {
  type        = set(string)
  description = "A set of developer principal object IDs, used for granting access to the Event Hub"
}
