resource "aws_db_parameter_group" "this" {
  name   = "${var.project_name}-pg16"
  family = "postgres16"

  # RDS for PostgreSQL 15+ rejects non-SSL connections by default, and the
  # app's TypeORM config connects without SSL. Traffic stays inside the
  # default VPC and the DB is not publicly accessible, so this is an
  # acceptable trade-off for a test; for production, enable SSL in the app
  # (ssl option + RDS CA bundle) and remove this parameter instead.
  parameter {
    name         = "rds.force_ssl"
    value        = "0"
    apply_method = "immediate"
  }
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project_name}-db"
  engine         = "postgres"
  engine_version = "16"

  parameter_group_name = aws_db_parameter_group.this.name

  # Free tier: 750 instance-hours/month + 20 GB storage for 12 months,
  # single-AZ only (Multi-AZ is NOT free).
  instance_class        = var.db_instance_class
  allocated_storage     = 20
  storage_type          = "gp3"
  multi_az              = false
  publicly_accessible   = false

  db_name  = var.db_name
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true
  deletion_protection = false

  # Free tier also includes 20 GB of automated backup storage, but backups
  # cost nothing extra to disable for a throwaway test environment.
  backup_retention_period = 0
}
