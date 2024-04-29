#!/bin/bash
__dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash ${__dir}./init.sh

rm /etc/nginx/sites-enabled/default
echo 'server {
    listen 80;
    listen [::]:80;

    server_name accounts.mouthwash.midlight.studio;

    location /v2/ {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_pass https://urban-space-fortnight-jjr4gjwpjpr63p9r9-8000.app.github.dev;
    }
}' > /etc/nginx/sites-enabled/accounts
service nginx restart

apt-get install -y certbot
apt install python3-certbot-nginx
certbot --nginx --non-interactive --agree-tos -m edward@midlight.studio --cert-name mouthwash_accounts -d accounts.mouthwash.midlight.studio;