#!/usr/bin/env bash
# Usage: ./get-cert.sh example.com
DOMAIN=$1
if [ -z "$DOMAIN" ]; then
  echo "Usage: $0 domain.tld"
  exit 1
fi

# create webroot dir
mkdir -p deploy/certbot_www

# issue cert using certbot container
docker-compose run --rm --entrypoint "certbot certonly --webroot -w /var/www/certbot -d $DOMAIN --agree-tos --email your-email@example.com --noninteractive" certbot

# reload nginx
docker-compose exec nginx nginx -s reload

echo "Certificate request finished. If successful, certs are in deploy/letsencrypt/live/$DOMAIN"
