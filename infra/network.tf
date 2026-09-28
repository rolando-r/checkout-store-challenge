# We deliberately reuse the account's default VPC instead of creating a new
# one. A custom VPC would need a NAT Gateway for the RDS/EC2 to reach the
# internet for package installs, and NAT Gateways are NOT free-tier — this
# keeps everything inside the default VPC's public subnets, which is enough
# for a test like this.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# RDS requires a subnet group spanning at least 2 AZs even for single-AZ deploys.
resource "aws_db_subnet_group" "this" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = data.aws_subnets.default.ids
}
