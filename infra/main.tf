terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state is fine for a take-home test — no need for an S3 backend,
  # that would be over-engineering here and adds an extra (tiny) cost.
}

provider "aws" {
  region = var.aws_region
}
