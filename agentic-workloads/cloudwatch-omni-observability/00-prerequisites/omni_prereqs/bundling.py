"""Bundle the space handler with a current boto3, without Docker.

The Lambda runtime's built-in boto3 has no cloudwatchomni client yet, so the
handler ships its own copy. Bundling runs `pip install` on the host, and falls
back to the Docker bundling image only if local bundling fails.
"""

import shutil
import subprocess
import sys
from pathlib import Path

import jsii
from aws_cdk import BundlingOptions, DockerImage, ILocalBundling
from aws_cdk import aws_lambda as lambda_

BOTO3_SPEC = "boto3>=1.43"


@jsii.implements(ILocalBundling)
class LocalPipBundling:
    def __init__(self, source: Path):
        self._source = source

    def try_bundle(self, output_dir: str, *, image=None, **_kwargs) -> bool:
        try:
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--quiet", "--no-compile",
                 "--platform", "manylinux2014_aarch64", "--only-binary=:all:",
                 "--python-version", "3.13", "--target", output_dir, BOTO3_SPEC],
                check=True,
            )
            for item in self._source.iterdir():
                if item.is_file():
                    shutil.copy2(item, output_dir)
            return True
        except (OSError, subprocess.CalledProcessError) as exc:
            print(f"local bundling failed ({exc}); falling back to Docker", file=sys.stderr)
            return False


def handler_code(source: Path) -> lambda_.Code:
    return lambda_.Code.from_asset(
        str(source),
        bundling=BundlingOptions(
            image=DockerImage.from_registry("public.ecr.aws/sam/build-python3.13"),
            command=["bash", "-c", f"pip install '{BOTO3_SPEC}' -t /asset-output && cp -r . /asset-output"],
            local=LocalPipBundling(source),
        ),
    )
