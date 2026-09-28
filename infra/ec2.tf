data "aws_ami" "al2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "app" {
  ami                    = data.aws_ami.al2023.id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.ec2.id]

  # cloud-init only runs user_data on the FIRST boot. Without this flag,
  # editing the script just stop/starts the instance and the new script
  # never executes. This makes Terraform destroy + recreate it instead.
  user_data_replace_on_change = true

  # Free tier: 30 GB of gp3 EBS included per month
  # and keeps you well under the limit.
  root_block_device {
    volume_type = "gp3"
    volume_size = 30
  }

  user_data = templatefile("${path.module}/user_data.sh.tpl", {
    git_repo_url              = var.git_repo_url
    db_username                = var.db_username
    # URL-encoded so reserved characters (: ; ? < > etc.) in the password
    # don't break the postgresql://user:pass@host/db connection string.
    db_password                = urlencode(var.db_password)
    db_endpoint                 = aws_db_instance.this.endpoint
    db_name                     = var.db_name
    gateway_base_url            = var.gateway_base_url
    gateway_public_key          = var.gateway_public_key
    gateway_private_key         = var.gateway_private_key
    gateway_events_secret       = var.gateway_events_secret
    gateway_integrity_secret    = var.gateway_integrity_secret
    base_fee_in_cents           = var.base_fee_in_cents
    delivery_fee_in_cents       = var.delivery_fee_in_cents
  })

  tags = {
    Name = "${var.project_name}-app"
  }

  # Rebuild+redeploy the containers whenever the app code changes, by
  # bumping this var manually (or wiring it to a git commit SHA) and
  # running terraform apply again — cheaper than a CI/CD pipeline for a
  # take-home test.
}
