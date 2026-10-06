"""Turn on IAM Identity Center (SSO) sign-in for the Omni domain, with least-privilege groups.

Run with MANAGEMENT-account credentials (the account that owns the organization
domain and the Identity Center instance), in the domain's Region:

    python enable_sso.py                                    # dry run: shows what would change
    python enable_sso.py --apply                            # domain + groups
    python enable_sso.py --apply --admin-user alice@example.com --viewer-user bob@example.com

It does three idempotent steps:
  1. adds IDC to the domain's identity providers (IAM sign-in stays on for automation/break-glass)
  2. creates two Identity Center groups:
       omni-space-admins  SPACE_ADMIN on the space (keep it small)
       omni-viewers       READ (Viewer) on the space
  3. optionally adds users to them (--admin-user / --viewer-user, by Identity Center user name)
and writes OMNI_ADMIN_GROUP_ID / OMNI_VIEWER_GROUP_ID into ../.env for the CDK stack,
which grants the groups access to the space.

The space must be in the domain's Region. Identity Center then needs no multi-Region replication.
"""

import argparse
import os
import pathlib
import re
import sys

import boto3

ROOT = pathlib.Path(__file__).resolve().parent.parent
ENV = ROOT / ".env"
GROUPS = {
    "OMNI_ADMIN_GROUP_ID": ("omni-space-admins", "CloudWatch Omni: Space Admins. Keep this group small."),
    "OMNI_VIEWER_GROUP_ID": ("omni-viewers", "CloudWatch Omni: read-only Viewers."),
}


def load_env():
    if ENV.exists():
        for line in ENV.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                # .env wins over the shell, like the bash scripts that source it, so a stray
                # AWS_REGION in your profile can't send one step to a different Region.
                if value.strip():
                    os.environ[key.strip()] = value.strip()


def set_env(key, value):
    text = ENV.read_text() if ENV.exists() else ""
    if re.search(rf"^#? ?{key}=.*$", text, flags=re.M):
        text = re.sub(rf"^#? ?{key}=.*$", f"{key}={value}", text, flags=re.M)
    else:
        text += f"\n{key}={value}\n"
    ENV.write_text(text)


def management_session():
    # common/assume-member-role.sh keeps the caller's own credentials as OMNI_BASE_*.
    # Use them if present, so this works in a shell that already switched to the member account.
    if os.environ.get("OMNI_BASE_AWS_ACCESS_KEY_ID"):
        return boto3.Session(
            aws_access_key_id=os.environ["OMNI_BASE_AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["OMNI_BASE_AWS_SECRET_ACCESS_KEY"],
            aws_session_token=os.environ.get("OMNI_BASE_AWS_SESSION_TOKEN") or None,
        )
    return boto3.Session()


def main():
    load_env()
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--apply", action="store_true")
    p.add_argument("--admin-user", action="append", default=[], help="Identity Center user name to add to omni-space-admins")
    p.add_argument("--viewer-user", action="append", default=[], help="Identity Center user name to add to omni-viewers")
    args = p.parse_args()

    session = management_session()
    account = session.client("sts").get_caller_identity()["Account"]
    region = os.environ["AWS_REGION"]
    omni = session.client("cloudwatchomni", region_name=region)

    domain = next((d for d in omni.list_domains()["items"]
                   if os.environ.get("OMNI_DOMAIN_ID") in (d["domainId"], d["name"], d["domainArn"])), None)
    if not domain:
        sys.exit(f"Domain {os.environ.get('OMNI_DOMAIN_ID')!r} not found")
    if ":organization-domain/" not in domain["domainArn"]:
        sys.exit("This script handles organization domains (UpdateDomainForOrganization). For an account domain, use UpdateDomain.")
    if domain["region"] != region:
        sys.exit(f"Run in the domain's Region: AWS_REGION={domain['region']} (the space must be there too)")
    detail = omni.get_domain_for_organization(domainId=domain["domainId"])["organizationDomain"]
    if detail["ownerAccountId"] != account:
        sys.exit(f"Use management-account credentials ({detail['ownerAccountId']}); these are for {account}")

    sso = session.client("sso-admin", region_name=region)
    instances = sso.list_instances()["Instances"]
    if len(instances) != 1:
        sys.exit(f"Expected one Identity Center instance in {region}, found {len(instances)}")
    instance_arn, store_id = instances[0]["InstanceArn"], instances[0]["IdentityStoreId"]
    print(f"Domain {detail['name']} ({domain['domainId']}) providers={detail['identityProviders']}")
    print(f"Identity Center {instance_arn} (store {store_id})")

    # 1. Domain sign-in
    if "IDC" in detail["identityProviders"]:
        print("= domain already allows Identity Center sign-in")
    elif args.apply:
        omni.update_domain_for_organization(
            domainId=domain["domainId"],
            identityProviders=sorted(set(detail["identityProviders"]) | {"IDC"}),
            identityProviderConfiguration={"identityCenterConfiguration": {"identityCenterInstanceArn": instance_arn}},
        )
        print("+ added IDC to the domain's identity providers (IAM kept)")
    else:
        print("+ would add IDC to the domain's identity providers (IAM kept)")

    # 2. Groups
    ids = session.client("identitystore", region_name=region)
    group_ids = {}
    for key, (name, description) in GROUPS.items():
        found = ids.list_groups(IdentityStoreId=store_id,
                                Filters=[{"AttributePath": "DisplayName", "AttributeValue": name}])["Groups"]
        if found:
            group_ids[key] = found[0]["GroupId"]
            print(f"= group {name} exists ({group_ids[key]})")
        elif args.apply:
            group_ids[key] = ids.create_group(IdentityStoreId=store_id, DisplayName=name, Description=description)["GroupId"]
            print(f"+ created group {name} ({group_ids[key]})")
        else:
            print(f"+ would create group {name}")

    # 3. Members
    for key, users in (("OMNI_ADMIN_GROUP_ID", args.admin_user), ("OMNI_VIEWER_GROUP_ID", args.viewer_user)):
        for user_name in users:
            matches = ids.list_users(IdentityStoreId=store_id,
                                     Filters=[{"AttributePath": "UserName", "AttributeValue": user_name}])["Users"]
            if len(matches) != 1:
                sys.exit(f"User name {user_name!r} matched {len(matches)} Identity Center users")
            if not args.apply or key not in group_ids:
                print(f"+ would add {user_name} to {GROUPS[key][0]}")
                continue
            try:
                ids.create_group_membership(IdentityStoreId=store_id, GroupId=group_ids[key],
                                            MemberId={"UserId": matches[0]["UserId"]})
                print(f"+ added {user_name} to {GROUPS[key][0]}")
            except ids.exceptions.ConflictException:
                print(f"= {user_name} already in {GROUPS[key][0]}")

    if args.apply:
        for key, value in group_ids.items():
            set_env(key, value)
        print(f"\nWrote {', '.join(group_ids)} to {ENV}. Next: deploy the stack (cdk deploy) to grant the groups.")
    else:
        print("\nDRY RUN. Re-run with --apply.")


if __name__ == "__main__":
    main()
