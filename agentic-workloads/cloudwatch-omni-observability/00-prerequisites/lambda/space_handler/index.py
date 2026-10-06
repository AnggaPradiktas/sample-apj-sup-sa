"""CloudFormation custom resource: an Omni space plus an admin access grant.

CloudFormation has no AWS::CloudWatchOmni::* resource types yet, so the CDK
Provider framework invokes this handler. It vendors boto3>=1.43 because the
Lambda runtime's built-in boto3 predates the cloudwatchomni service model.

Properties (all strings):
  DomainId                    domain ID, name, or ARN (account- or org-scoped)
  SpaceName
  DataAccessRoleArn           the space access role
  AgentCoreEvaluationRoleArn  optional
  AdminGroupId                optional Identity Center group ID -> SPACE_ADMIN (recommended for people)
  ViewerGroupId               optional Identity Center group ID -> READ (Viewer)
  AdminPrincipalArn           optional IAM role/user ARN -> SPACE_ADMIN (break-glass / automation)
  AdoptExistingSpace          "true" to manage a space that already exists in this Region
  RetainOnDelete              "true" (default) keeps the space when the stack is deleted
"""

import logging
import os
import re
import time

import boto3
from botocore.exceptions import ClientError

log = logging.getLogger()
log.setLevel(logging.INFO)

REGION = os.environ["AWS_REGION"]
omni = boto3.client("cloudwatchomni", region_name=REGION)
GRANT_NAME = "omni-samples-admin"


def on_event(event, _context):
    log.info("request %s %s", event["RequestType"], {k: v for k, v in event.items() if k != "ResponseURL"})
    props = event["ResourceProperties"]
    if event["RequestType"] == "Create":
        return create(props)
    if event["RequestType"] == "Update":
        return update(event["PhysicalResourceId"], props, event.get("OldResourceProperties", {}))
    return delete(event["PhysicalResourceId"], props)


# --- domain -----------------------------------------------------------------

def resolve_domain(ref):
    """Return (domain_id, endpoint_url) for a domain ID, name, or ARN."""
    for page in omni.get_paginator("list_domains").paginate():
        for d in page["items"]:
            if ref in (d["domainId"], d["name"], d["domainArn"]):
                return d["domainId"], endpoint_url(d)
    raise RuntimeError(f"Domain {ref!r} not found. List yours with: aws cloudwatchomni list-domains")


def endpoint_url(summary):
    """Best-effort sign-in URL. It's informational, so a read failure must not fail the space."""
    try:
        # Account domains are read with GetDomain. Organization domains are read with
        # GetDomainForOrganization, which only the management account may call; member
        # accounts get AccessDenied and fall back to the documented URL format.
        if ":organization-domain/" in summary["domainArn"]:
            d = omni.get_domain_for_organization(domainId=summary["domainId"])["organizationDomain"]
        else:
            d = omni.get_domain(domainId=summary["domainId"])["domain"]
        return (d.get("customEndpointUrls") or [d.get("domainEndpointUrl", "")])[0]
    except ClientError as exc:
        log.info("domain read failed (%s); using the documented URL format", exc.response["Error"]["Code"])
        return f"https://{summary['name']}.cloudwatch-omni.global.app.aws"


# --- space ------------------------------------------------------------------

def spaces_in_region():
    found = []
    for page in omni.get_paginator("list_spaces").paginate():
        found += [s for s in page["items"] if s["region"] == REGION]
    return found


def wait_active(space_id, timeout=480):
    deadline = time.time() + timeout
    while True:
        space = omni.get_space(spaceId=space_id)["space"]
        if space["status"] == "ACTIVE":
            return space
        if time.time() > deadline:
            raise RuntimeError(f"Space {space_id} is {space['status']}: {space.get('statusReason', '')}")
        time.sleep(10)


def create(props):
    domain_id, url = resolve_domain(props["DomainId"])
    existing = spaces_in_region()
    adopted = False
    if existing:
        space = existing[0]
        if props.get("AdoptExistingSpace") != "true":
            raise RuntimeError(
                f"A space already exists in {REGION}: {space['name']} ({space['spaceId']}). Omni allows one "
                "space per account per Region. Re-deploy with -c adoptExistingSpace=true to use it."
            )
        log.info("adopting existing space %s", space["spaceId"])
        adopted = True
        space_id = space["spaceId"]
    else:
        request = {
            "name": props["SpaceName"],
            "domainId": domain_id,
            "dataAccessRoleArn": props["DataAccessRoleArn"],
            "tags": {"project": "omni-samples"},
        }
        if props.get("AgentCoreEvaluationRoleArn"):
            request["agentCoreEvaluationRoleArn"] = props["AgentCoreEvaluationRoleArn"]
        try:
            space_id = omni.create_space(**request)["space"]["spaceId"]
        except ClientError as exc:
            if "management account" in str(exc):
                raise RuntimeError(
                    f"{exc}. Domain {props['DomainId']!r} is an organization domain, and spaces under it "
                    "live in member accounts. Deploy this stack with credentials for a member account."
                ) from exc
            raise
        log.info("created space %s", space_id)

    # create-space never tries to assume the role, so a wrong trust policy shows up
    # only when the space is used. Reading it back at least confirms it reached ACTIVE.
    space = wait_active(space_id)
    return response(space, url, adopted, ensure_grants(domain_id, space_id, props))


def update(space_id, props, old):
    if props["DomainId"] != old.get("DomainId") or props["DataAccessRoleArn"] != old.get("DataAccessRoleArn"):
        raise RuntimeError("Changing the domain or the space access role needs a new space. Delete the space first.")
    domain_id, url = resolve_domain(props["DomainId"])
    if props["SpaceName"] != old.get("SpaceName") and old.get("AdoptExistingSpace") != "true":
        omni.update_space(spaceId=space_id, name=props["SpaceName"])
    space = wait_active(space_id)
    return response(space, url, old.get("AdoptExistingSpace") == "true", ensure_grants(domain_id, space_id, props))


def delete(space_id, props):
    if props.get("RetainOnDelete", "true") == "true" or props.get("AdoptExistingSpace") == "true":
        log.info("retaining space %s (RetainOnDelete or adopted)", space_id)
        return {"PhysicalResourceId": space_id}
    try:
        omni.delete_space(spaceId=space_id)  # destroys the space and its telemetry
        log.info("deleted space %s", space_id)
    except ClientError as exc:
        if exc.response["Error"]["Code"] != "ResourceNotFoundException":
            raise
    return {"PhysicalResourceId": space_id}


# --- access grant -------------------------------------------------------------

def to_principal(arn):
    """Map an IAM or sts assumed-role ARN to an Omni grant principal."""
    m = re.match(r"arn:(aws[\w-]*):sts::(\d{12}):assumed-role/([^/]+)/", arn)
    if m:  # assumed-role sessions don't carry the role path; this assumes the role has none
        arn = f"arn:{m[1]}:iam::{m[2]}:role/{m[3]}"
    if ":role/" in arn:
        return {"principalType": "IAM_ROLE", "principalId": arn}
    if ":user/" in arn:
        return {"principalType": "IAM_USER", "principalId": arn}
    if arn.endswith(":root"):
        return {"principalType": "IAM_ROOT", "principalId": arn}
    raise RuntimeError(f"AdminPrincipalArn must be an IAM role, user, or root ARN, got {arn!r}")


def ensure_grants(domain_id, space_id, props):
    """Grant the configured principals. Identity Center groups are the recommended path for people."""
    wanted = []
    if props.get("AdminGroupId"):
        wanted.append(("omni-space-admins", {"principalType": "IDC_GROUP", "principalId": props["AdminGroupId"]}, "SPACE_ADMIN"))
    if props.get("ViewerGroupId"):
        wanted.append(("omni-viewers", {"principalType": "IDC_GROUP", "principalId": props["ViewerGroupId"]}, "READ"))
    if props.get("AdminPrincipalArn"):
        wanted.append((GRANT_NAME, to_principal(props["AdminPrincipalArn"]), "SPACE_ADMIN"))
    return ",".join(ensure_grant(domain_id, space_id, name, principal, permission)
                    for name, principal, permission in wanted)


def ensure_grant(domain_id, space_id, name, principal, permission):
    for page in omni.get_paginator("list_access_grants").paginate(
        spaceId=space_id, principalType=principal["principalType"], principalId=principal["principalId"]
    ):
        for grant in page["items"]:
            if grant["permission"] == permission:
                return grant["grantId"]
    grant = omni.create_access_grant(
        domainId=domain_id, spaceId=space_id, name=name, principal=principal,
        permission=permission, tags={"project": "omni-samples"},
    )["accessGrant"]
    log.info("granted %s to %s %s (%s)", permission, principal["principalType"], principal["principalId"], grant["grantId"])
    return grant["grantId"]


def response(space, url, adopted, grant_ids):
    return {
        "PhysicalResourceId": space["spaceId"],
        "Data": {
            "SpaceId": space["spaceId"],
            "SpaceArn": space["spaceArn"],
            "DomainEndpointUrl": url,
            "Adopted": "true" if adopted else "false",
            "GrantIds": grant_ids,
        },
    }
