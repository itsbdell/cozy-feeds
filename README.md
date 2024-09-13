# Cozy Feeds
Generate your own RSS feeds on your own schedule. Customize the content, set a schedule, and resurface old favorites. Cozy Feeds is the most customizable RSS feed service on the planet. 

And it's cozy. 

## How To Use
Cozy feeds requires a server accessible on the web. If you're a devloper, skip to the dev docs section. If you're not a developer, we've tried to make this as easy as possible. You'll need to sign up for a free Digital Ocean account, and then you can simply click the button below: 

[![Deploy to DO](https://www.deploytodo.com/do-btn-blue.svg)](https://cloud.digitalocean.com/apps/new?repo=https://github.com/itsbdell/cozy-feeds/tree/main)

## Dev Docs

To run Cozy Feeds locally, follow these steps: 

1. Close the repo: `git clone https://github.com/itsbdell/cozy-feeds.git`
2. Change into the cozy-feeds directory: `cd cozy-feeds`
3. Install dependencies: `npm i`
4. Run the app: `npm run dev`

The app will run on port 3000 and stores all data locally in JSON files. 

## Known Limitations
This open source repository is free for anyone to customize and make work for their needs, but there are some out-of-the-box limitations. 

First, there is no authorization mechanism. Your cozy feed app, if accessed by someone else, can be adjusted. Feeds can be deleted or updated. If you're a developer, you can add authorization and authentication. If you're not, you can keep your deployed app private and only use it yourself. 

Second, because the data is stored in local files, you will be limited to the volume storage size available on the server you're running the app on. If this ever becomes a concern, Cozy Feeds can be updated to use a remote database. 