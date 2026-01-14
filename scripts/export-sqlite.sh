#!/bin/bash

# Export SQLite database to SQL files for PostgreSQL import
# Usage: ./scripts/export-sqlite.sh

EXPORT_DIR="/tmp/db_export"
SQLITE_DB=".tmp/data.db"

# Create export directory
mkdir -p $EXPORT_DIR

echo "Exporting from $SQLITE_DB to $EXPORT_DIR"
echo ""

# All content tables to export
TABLES=(
  "site_types"
  "facilities"
  "tags"
  "user_roles"
  "filter_groups"
  "filters"
  "auth_users"
  "sites"
  "posts"
  "faqs"
  "quicklinks"
  "nomad_routes"
  "minimum_app_versions"
  "directions_killswitches"
  "forms"
  "subscriptions"
  "comments"
  "edit_requests"
  "addition_requests"
  "form_submissions"
)

# Link tables
LINK_TABLES=(
  "sites_type_links"
  "sites_facilities_links"
  "sites_owners_links"
  "sites_added_by_links"
  "sites_contributors_links"
  "sites_sub_types_links"
  "sites_tags_links"
  "site_types_facilities_links"
  "auth_users_role_links"
  "auth_users_favourites_links"
  "filters_components"
  "filter_groups_components"
  "addition_requests_owner_links"
  "addition_requests_type_links"
  "addition_requests_facilities_links"
  "addition_requests_sub_types_links"
  "addition_requests_potential_duplicates_links"
  "edit_requests_site_links"
  "edit_requests_owner_links"
  "edit_requests_facilities_links"
  "comments_owner_links"
  "comments_site_links"
  "subscriptions_user_role_links"
  "nomad_routes_tags_links"
  "nomad_routes_stay_links"
  "nomad_routes_pois_links"
  "posts_tags_links"
  "posts_components"
)

echo "Exporting content tables..."
for table in "${TABLES[@]}"; do
  sqlite3 "$SQLITE_DB" ".mode insert $table" "SELECT * FROM $table;" > "$EXPORT_DIR/${table}.sql" 2>/dev/null
  count=$(grep -c "INSERT" "$EXPORT_DIR/${table}.sql" 2>/dev/null || echo "0")
  if [ "$count" -gt 0 ]; then
    echo "  $table: $count rows"
  fi
done

echo ""
echo "Exporting link tables..."
for table in "${LINK_TABLES[@]}"; do
  sqlite3 "$SQLITE_DB" ".mode insert $table" "SELECT * FROM $table;" > "$EXPORT_DIR/${table}.sql" 2>/dev/null
  count=$(grep -c "INSERT" "$EXPORT_DIR/${table}.sql" 2>/dev/null || echo "0")
  if [ "$count" -gt 0 ]; then
    echo "  $table: $count rows"
  fi
done

echo ""
echo "Export complete. Files in: $EXPORT_DIR"
echo ""
echo "To import to Heroku, run:"
echo "  1. Upload export files to Heroku (or run import script locally)"
echo "  2. DATABASE_URL=\$(heroku config:get DATABASE_URL -a nomadapp-api) node scripts/import-to-heroku.js"
