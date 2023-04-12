# DEPRECATION NOTICE

This app has been replaced by Amelio.

# Humeur du mois

Is everything alright for you at Zenika? We'd like to know! This is an app that asks Zenika's employees how they feel. If the answer is not positive, the company has to take action.

## Status

In production.

## Links

- [App](https://humeur-du-mois-2018.firebaseapp.com) (only zenika.com adresses are authorized to log in)
- [Firebase Console](https://console.firebase.google.com/) (requires access permissions, see below)

## Development

The app uses Firebase so you must have permission to access. Contact dsi@zenika.com to ask for access (only zenika.com addresses can reach that address).

### Setup

- `npm install`
- `cd functions && npm install && cd ..`
- `cd ui && npm install && cd ..`
- `npm run firebase login`
- `npm run firebase use default`
- `npm run --silent firebase functions:config:get > functions/.runtimeconfig.json`

### Commands

- `npm run firebase:emulators` to launch the Firebase Local Emulator Suite
- `npm start` to serve locally
  - functions are compiled and deployed on save
  - UI is compiled on save but the browser is not reloaded
  - only emulates HTTP functions
- `npm run start:shell` to test non-HTTP functions
  - functions are compiled and deployed on save
- `npm run deploy` to deploy

### Troubleshooting on linux

- If you're running the app on linux you might have a 'ENOSPC' error, this is due to too many files being watched. It can be fixed using `echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p` (see: https://github.com/facebook/jest/issues/3254#issuecomment-297214395 )
