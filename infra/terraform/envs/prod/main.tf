terraform {
  required_version = ">= 1.10.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

# The API token is read from the HCLOUD_TOKEN environment variable, so it
# never appears in code, state of this file, or git.
provider "hcloud" {}

locals {
  environment = "prod"
  name        = "portfolio-${local.environment}"
  labels = {
    project     = "portfolio"
    environment = local.environment
    managed-by  = "terraform"
  }
}

module "network" {
  source = "../../modules/network"

  name   = local.name
  labels = local.labels
}

module "firewall" {
  source = "../../modules/firewall"

  name           = local.name
  admin_cidrs    = var.admin_cidrs
  apply_to_label = "role=k8s-node"
  labels         = local.labels
}

module "server" {
  source = "../../modules/server"

  name           = local.name
  ssh_public_key = var.ssh_public_key
  server_type    = var.server_type
  location       = var.location
  network_id     = module.network.network_id
  volume_size_gb = var.volume_size_gb
  protect        = var.protect
  labels         = local.labels

  # Ensure the subnet exists before the server tries to attach to it.
  depends_on = [module.network]
}
