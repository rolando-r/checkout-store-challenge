variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used to name every resource"
  type        = string
  default     = "checkout-store"
}

# ---- EC2 (backend + frontend containers) ----

variable "instance_type" {
  description = "Free-tier eligible EC2 instance type. Use t2.micro on accounts older than mid-2022, t3.micro on newer accounts (check the free tier tab in the console before applying)."
  type        = string
  default     = "t3.micro"
}

variable "key_name" {
  description = "Name of an EXISTING EC2 key pair (create it in EC2 > Key Pairs first) used to SSH into the instance"
  type        = string
}

variable "ssh_allowed_cidr" {
  description = "Your IP in CIDR form (e.g. 200.1.2.3/32), so SSH isn't open to the world"
  type        = string
}

variable "git_repo_url" {
  description = "Public HTTPS URL of your GitHub repo, e.g. https://github.com/you/checkout-store-challenge.git"
  type        = string
}

# ---- RDS ----

variable "db_instance_class" {
  description = "Free-tier eligible RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  type    = string
  default = "checkout_store"
}

variable "db_username" {
  type    = string
  default = "postgres"
}

variable "db_password" {
  description = "RDS master password. Pass via terraform.tfvars (gitignored) or TF_VAR_db_password env var — never commit it."
  type        = string
  sensitive   = true
}

# ---- Payment gateway sandbox ----

variable "gateway_base_url" {
  type    = string
  default = "https://api-sandbox.co.uat.gateway.dev/v1"
}

variable "gateway_public_key" {
  type      = string
  sensitive = true
}

variable "gateway_private_key" {
  type      = string
  sensitive = true
}

variable "gateway_events_secret" {
  type      = string
  sensitive = true
}

variable "gateway_integrity_secret" {
  type      = string
  sensitive = true
}

variable "base_fee_in_cents" {
  type    = number
  default = 300000
}

variable "delivery_fee_in_cents" {
  type    = number
  default = 500000
}
