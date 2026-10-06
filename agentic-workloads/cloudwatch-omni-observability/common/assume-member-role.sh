# Source this to run the samples in an AWS Organizations MEMBER account:
#     source common/assume-member-role.sh
# It assumes OMNI_MEMBER_ROLE_ARN (from .env) and exports temporary credentials, so
# the AWS CLI, boto3, the CDK, and docker compose (via up.sh) all act in that account.
# The credentials last about an hour; source the script again to refresh them.
#
# Why not AWS_PROFILE: when AWS_ACCESS_KEY_ID is already set in the environment (for
# example from an SSO or credential helper), the SDKs use it and ignore AWS_PROFILE.

_omni_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
if [ -f "$_omni_root/.env" ]; then set -a; . "$_omni_root/.env"; set +a; fi

if [ -z "${OMNI_MEMBER_ROLE_ARN:-}" ]; then
  echo "Set OMNI_MEMBER_ROLE_ARN in .env (e.g. arn:aws:iam::<member-acct>:role/OrganizationAccountAccessRole)"
else
  # Remember the caller's own credentials the first time, so re-sourcing can refresh
  # (a member-account session can't assume OrganizationAccountAccessRole again).
  if [ -z "${OMNI_BASE_AWS_ACCESS_KEY_ID:-}" ]; then
    export OMNI_BASE_AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-}" \
           OMNI_BASE_AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}" \
           OMNI_BASE_AWS_SESSION_TOKEN="${AWS_SESSION_TOKEN:-}"
  fi
  _omni_creds=$(AWS_ACCESS_KEY_ID="$OMNI_BASE_AWS_ACCESS_KEY_ID" \
                AWS_SECRET_ACCESS_KEY="$OMNI_BASE_AWS_SECRET_ACCESS_KEY" \
                AWS_SESSION_TOKEN="$OMNI_BASE_AWS_SESSION_TOKEN" \
                aws sts assume-role --role-arn "$OMNI_MEMBER_ROLE_ARN" --role-session-name omni-samples \
                  --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken,Expiration]' --output text)
  if [ -n "$_omni_creds" ]; then
    read -r AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN _omni_exp <<< "$_omni_creds"
    export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_SESSION_TOKEN
    unset AWS_PROFILE
    echo "Now acting as $(aws sts get-caller-identity --query Arn --output text) until $_omni_exp"
  fi
  unset _omni_creds _omni_exp
fi
unset _omni_root
