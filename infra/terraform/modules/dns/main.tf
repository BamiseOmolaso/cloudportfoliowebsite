# One Cloudflare DNS record per entry in var.records.
resource "cloudflare_dns_record" "this" {
  for_each = var.records

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type
  content = each.value.content
  proxied = each.value.proxied
  comment = each.value.comment

  # TTL (how long resolvers cache the answer). 1 means "automatic", which is
  # required when the record is proxied.
  ttl = 1
}
