#!/usr/bin/env bash
# renew all certs in the certbot container
docker-compose run --rm --entrypoint "certbot renew --webroot -w /var/www/certbot" certbot
# reload nginx
docker-compose exec nginx nginx -s reload
