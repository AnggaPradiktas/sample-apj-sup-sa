#!/usr/bin/env python3
"""CDK app for step 0: the CloudWatch Omni prerequisites for the samples."""

import os
from pathlib import Path

import aws_cdk as cdk

from omni_prereqs.stack import OmniPrereqsStack


def load_env(path: Path) -> None:
    """Read ../.env (the file the samples use). Its non-empty values override the shell."""
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            # .env wins over the shell, like the bash scripts that source it, so a stray
            # AWS_REGION in your profile can't send one step to a different Region.
            if value.strip():
                os.environ[key.strip()] = value.strip()


load_env(Path(__file__).resolve().parent.parent / ".env")
app = cdk.App()
OmniPrereqsStack(
    app, "OmniSamplesPrereqs",
    env=cdk.Environment(
        account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
        region=os.environ.get("AWS_REGION") or os.environ.get("CDK_DEFAULT_REGION"),
    ),
    description="CloudWatch Omni samples, step 0: space, dataset integration, roles, shared resources",
)
app.synth()
