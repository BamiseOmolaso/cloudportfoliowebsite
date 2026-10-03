terraform {
  required_version = ">= 1.10.0"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# The API token is read from the HCLOUD_TOKEN environment variable, so it
# never appears in code, state of this file, or git.
provider "hcloud" {}

# Reads the CLOUDFLARE_API_TOKEN environment variable (never put it in code).
provider "cloudflare" {}

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

# Cloudflare's published address ranges (read live from Cloudflare, no token
# permission needed). Web ports are opened to these only, so visitors cannot
# bypass Cloudflare. If Cloudflare adds a range, the next plan shows it.
data "cloudflare_ip_ranges" "this" {}

module "firewall" {
  source = "../../modules/firewall"

  name           = local.name
  admin_cidrs    = var.admin_cidrs
  wireguard_port = var.wireguard_port
  web_source_ips = concat(data.cloudflare_ip_ranges.this.ipv4_cidrs, data.cloudflare_ip_ranges.this.ipv6_cidrs)
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

# DNS records. Only hosts listed here are managed by Terraform; other records in
# the zone (such as the old WordPress one) are left alone until we cut over.
module "dns" {
  source = "../../modules/dns"

  zone_id = var.cloudflare_zone_id

  records = {
    # A temporary test host, so we can prove HTTPS before touching the real domain.
    test = {
      name    = "test"
      type    = "A"
      content = module.server.ipv4
      comment = "Test host for the new cluster (Terraform)"
    }

    # The real domain (the "apex"). This record already existed, made by hand and
    # pointing at the old hosting, so Terraform must IMPORT it before it can manage it
    # (doc 08, section 6). `www` is a CNAME to this name, so it follows automatically.
    # Mail does NOT use this record any more: MX, mail and ftp use `mailhost`.
    apex = {
      name    = "@"
      type    = "A"
      content = module.server.ipv4
      comment = "Real domain, served by the new cluster (Terraform)"
    }
  }
}
