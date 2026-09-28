output "app_url" {
  description = "Public HTTPS URL — put this in your README as the deployed link"
  value       = "https://${aws_cloudfront_distribution.this.domain_name}"
}

output "ec2_public_dns" {
  description = "Direct EC2 address (HTTP only) — useful for debugging before/without CloudFront"
  value       = aws_instance.app.public_dns
}

output "rds_endpoint" {
  description = "Postgres endpoint (host:port) — only reachable from the EC2 instance's security group"
  value       = aws_db_instance.this.endpoint
}
