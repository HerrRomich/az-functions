variable "resource_group" {
  type        = string
  description = "Resource Group Name where all resources will be created"
}

variable "location" {
  type        = string
  description = "Azure region where resources will be created"
}

variable "common_tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
}
