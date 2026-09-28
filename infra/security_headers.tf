locals {
  # Origin (scheme + host) of the payment gateway, derived from the variable so
  # no provider name is hardcoded in the repo. The browser calls it directly to
  # tokenize the card, so the CSP must allow it in connect-src.
  gateway_origin = regex("^https?://[^/]+", var.gateway_base_url)
}

resource "aws_cloudfront_response_headers_policy" "security" {
  name    = "${var.project_name}-security-headers"
  comment = "Security headers for the SPA (Mozilla Observatory / OWASP)"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 31536000 # 1 year
      include_subdomains         = false
      preload                    = false
      override                   = true
    }

    content_type_options {
      override = true # X-Content-Type-Options: nosniff
    }

    frame_options {
      frame_option = "DENY"
      override     = true
    }

    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }

    content_security_policy {
      override = true
      content_security_policy = join("; ", [
        "default-src 'self'",
        "connect-src 'self' ${local.gateway_origin}",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline'",
        "script-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ])
    }
  }

  custom_headers_config {
    items {
      header   = "Permissions-Policy"
      value    = "geolocation=(), microphone=(), camera=()"
      override = true
    }
  }
}
