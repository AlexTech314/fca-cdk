#!/bin/bash
# ==============================================
# Setup Cognito Local — creates user pool, client, and admin user
#
# Usage:
#   ./scripts/setup-cognito.sh
#
# Prerequisites:
#   - cognito-local running at localhost:9229 (docker-compose up cognito)
#   - aws CLI installed
# ==============================================

set -e

ENDPOINT="http://localhost:9229"
REGION="us-east-2"
ADMIN_EMAIL="admin@flatironscap.com"
ADMIN_PASSWORD="Admin123!"

echo "=== Setting up Cognito Local ==="

# Create User Pool
echo "Creating user pool..."
POOL_RESULT=$(aws cognito-idp create-user-pool \
  --pool-name "FCA-Admin-Pool" \
  --auto-verified-attributes email \
  --schema '[{"Name":"email","Required":true,"Mutable":true}]' \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" \
  --output json 2>&1)

POOL_ID=$(echo "$POOL_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPool']['Id'])" 2>/dev/null || echo "")

if [ -z "$POOL_ID" ]; then
  echo "Failed to create user pool. Output:"
  echo "$POOL_RESULT"
  exit 1
fi

echo "  User Pool ID: $POOL_ID"

# Create User Pool Client
echo "Creating user pool client..."
CLIENT_RESULT=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name "FCA-Admin-Client" \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" \
  --output json 2>&1)

CLIENT_ID=$(echo "$CLIENT_RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin)['UserPoolClient']['ClientId'])" 2>/dev/null || echo "")

if [ -z "$CLIENT_ID" ]; then
  echo "Failed to create client. Output:"
  echo "$CLIENT_RESULT"
  exit 1
fi

echo "  Client ID: $CLIENT_ID"

# Create Admin Group
echo "Creating admin group..."
aws cognito-idp create-group \
  --user-pool-id "$POOL_ID" \
  --group-name "admin" \
  --description "Administrators" \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "  (group may already exist)"

# Create Admin User
echo "Creating admin user: $ADMIN_EMAIL"
aws cognito-idp admin-create-user \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --user-attributes Name=email,Value="$ADMIN_EMAIL" Name=email_verified,Value=true \
  --temporary-password "$ADMIN_PASSWORD" \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "  (user may already exist)"

# Add user to admin group
echo "Adding user to admin group..."
aws cognito-idp admin-add-user-to-group \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --group-name "admin" \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "  (assignment may already exist)"

# Set permanent password (skip the temp password challenge for dev)
echo "Setting permanent password..."
aws cognito-idp admin-set-user-password \
  --user-pool-id "$POOL_ID" \
  --username "$ADMIN_EMAIL" \
  --password "$ADMIN_PASSWORD" \
  --permanent \
  --endpoint-url "$ENDPOINT" \
  --region "$REGION" 2>/dev/null || echo "  (may already be set)"

echo ""
echo "=== Cognito Local Setup Complete ==="
echo ""
echo "User Pool ID:  $POOL_ID"
echo "Client ID:     $CLIENT_ID"
echo "Admin Email:   $ADMIN_EMAIL"
echo "Admin Password: $ADMIN_PASSWORD"
echo ""
echo "Add these to your .env files:"
echo ""
echo "  # API .env.local"
echo "  COGNITO_USER_POOL_ID=$POOL_ID"
echo "  COGNITO_CLIENT_ID=$CLIENT_ID"
echo "  COGNITO_ENDPOINT=http://cognito:9229"
echo ""
echo "  # Next.js .env.admin"
echo "  NEXT_PUBLIC_COGNITO_USER_POOL_ID=$POOL_ID"
echo "  NEXT_PUBLIC_COGNITO_CLIENT_ID=$CLIENT_ID"
echo "  NEXT_PUBLIC_COGNITO_ENDPOINT=http://localhost:9229"
echo ""
