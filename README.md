# funnel-api

Collect emails from a funnel page.

1. Install [node](https://webinstall.dev/node)
   ```sh
   webi node
   source ~/.config/envman/PATH.env
   ```
2. Clone and Enter the Repo
   ```sh
   git clone https://github.com/bnnanet/funnel-api.git
   pushd ./funnel-api/
   ```
3. Configure & Change the Message Template
   ```sh
   cp -rRP example.env .env
   vim .env
   vim app.js
   ```
4. Install deps and run
   ```sh
   npm ci
   npm start
   ```
5. Test with `curl`:

   ```sh
   my_email="test@example.com"

   curl -X POST http://localhost:2662/api/request-invite \
       -H 'Content-Type: application/json' \
       --data-binary '
           {
               "email": "'"${my_email}"'"
           }
       '
   ```

6. Save as system service
   ```sh
   sudo env PATH="$PATH" \
       serviceman add \
       --path="$PATH" \
       --name funnel-api \
       --system \
       --username "$(whoami)" \
       -- \
       npm start
   ```
