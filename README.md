# Humeur du mois 2018

Is everything alright for you at Zenika? We'd like to know! This is an app that asks Zenika's employees how they feel. If the answer is not positive, the company has to take action.

## Status

Prototype.

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

### Commands

- `npm start` to serve locally
  - functions are compiled and deployed on save
  - UI is compiled on save but the browser is not reloaded
- `npm run deploy` to deploy
