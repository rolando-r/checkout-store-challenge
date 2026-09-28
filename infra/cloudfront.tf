locals {
  # Every top-level route your Nest.js app exposes, so each gets its own
  # CloudFront behavior pointing at the backend origin instead of the
  # frontend one. If you later add `app.setGlobalPrefix('api')` in
  # main.ts, replace this whole list with a single "/api/*" entry.
  backend_path_patterns = [
    "/products*",
    "/stock*",
    "/customers*",
    "/transactions*",
    "/deliveries*",
    "/checkout*",
    "/docs*",
    "/docs-json*",
  ]
}

resource "aws_cloudfront_distribution" "this" {
  enabled = true
  comment = "${var.project_name} — frontend + backend behind one HTTPS domain"

  origin {
    origin_id   = "frontend-origin"
    domain_name = aws_instance.app.public_dns

    custom_origin_config {
      http_port              = 8080
      https_port              = 443
      origin_protocol_policy  = "http-only" # viewer<->CloudFront is HTTPS; CloudFront<->EC2 stays on AWS's own network
      origin_ssl_protocols    = ["TLSv1.2"]
    }
  }

  origin {
    origin_id   = "backend-origin"
    domain_name = aws_instance.app.public_dns

    custom_origin_config {
      http_port               = 3000
      https_port               = 443
      origin_protocol_policy   = "http-only"
      origin_ssl_protocols     = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "frontend-origin"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods         = ["GET", "HEAD"]
    cached_methods           = ["GET", "HEAD"]

    # Security headers are added at the edge, on the HTTPS side (HSTS only
    # makes sense there). Only the SPA gets them: the /docs* behaviors are
    # left alone because Swagger UI relies on inline scripts a strict CSP blocks.
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security.id

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }
  }

  dynamic "ordered_cache_behavior" {
    for_each = local.backend_path_patterns
    content {
      path_pattern            = ordered_cache_behavior.value
      target_origin_id        = "backend-origin"
      viewer_protocol_policy  = "redirect-to-https"
      allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
      cached_methods            = ["GET", "HEAD"]

      # API responses: never cache, always forward everything through.
      min_ttl     = 0
      default_ttl = 0
      max_ttl     = 0

      forwarded_values {
        query_string = true
        headers      = ["*"]
        cookies {
          forward = "all"
        }
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # *.cloudfront.net certificate — free, no domain purchase or ACM setup needed.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
