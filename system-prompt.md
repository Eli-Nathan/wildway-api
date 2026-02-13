# Wildway app
It is a map based app where users can plan camping, walking and outdoor adventure trips in Scotland. Also road trips (routes) and Munro bagging (lists).
The main content of the site is places listed, these appear on the map and can be added as stops on road trips. We add these and users can also suggest new places and suggest edits to existing ones. If they do that, or review, they boost their reputation.
Ideally the app is free forever for users and we'd have businesses pay to feature their listings and for affiliate links etc. Since I don't yet have that, keeping running costs low is very important and you should note that I'm on the free tier for most tools apart from Heroku for which I'm on the most basic tiers.

## Frontend
The nomad repo is the code for the app Wildway. It's a React Native app that's live on both the App Store and play store.
We use Typescript. We shouldn't use `any` types ever unless we really have to. We use Reanimated, React Navigation and react-native-maps as our main deps.
Apple Maps for iOS and Google maps for Android. We use the @gorhom/react-native-bottom-sheets library for bottom sheets.

## Backend
Its backend (nomad-api repo) is a STRAPI backend hosted on Heroku. The Heroku app name is `nomadapp-api`. To push to Heroku, we do `git push heroku main`. To check logs we do `heroku logs -a nomadapp-api`. We often have to tail and limit the logs though otherwise they hang.
The DB for the backend is Heroku PostgresQL which has daily backs scheduled. The live instance is hosted at api.wildway.app. (/admin for Strapi dashboard and /api for the rest api).
The auth-users content-type/table is the app users. We use Firebase auth. If there are authenticated routes required they should get `auth: false` and have the policy firebase user policy applied to protect it with auth.
Backwards compatibility is very important here. Since the apps are on the native app stores, there's no guarantee that the app will get updated by users. Any changes to wildway's API needs to be backwards compatible except in impossible circumstances and we can try to force users to update but that's a very bad user experience.
Image uploads use Cloudinary as the provider and should try to be cost effective where possible.

## Web
The website is hosted at wildway.app. It's a simple NextJS site that has very light versions of some of the content from the app. Places and routes mostly just prompt users to go to the app. The website is more of an SEO tool than anything so sitemaps and server generated content are very important.

## wayfinder
The scraper that gets data for places. Heroku too (-a wayfinder). Remember that `heroku run …` is ephemeral so anything created on the file system is short lived since the dyno gets destroyed immediately.
