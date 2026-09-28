resource "aws_security_group" "ec2" {
  name        = "${var.project_name}-ec2-sg"
  description = "Backend (3000) + frontend (8080) containers, SSH restricted to your IP"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "SSH from your IP only"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ssh_allowed_cidr]
  }

  # Open to 0.0.0.0/0 because CloudFront does not have a fixed IP range you
  # can pin down easily. Traffic still only carries app data (no secrets in
  # the URL), and the viewer-facing side is HTTPS via CloudFront. If you
  # want to tighten this later, restrict these two to the
  # "com.amazonaws.global.cloudfront.origin-facing" managed prefix list.
  ingress {
    description = "Frontend (nginx) - reachable directly too, CloudFront is optional hardening"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Backend (Nest.js)"
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Postgres reachable only from the EC2 instance"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description     = "Postgres from the app EC2 only"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
