# Humeur du mois 2018

Is everything alright for you at Zenika? We'd like to know! This is an app that asks Zenika's employees how they feel. If the answer is not positive, the company has to take action.

## Status

Prototype.

## Links

- [App](https://humeur-du-mois-2018.firebaseapp.com) (only zenika.com adresses are authorized to log in)
- [Firebase Console](https://console.firebase.google.com/) (requires access permissions, see below)

## Development

The app uses Firebase so you must have permission to access. Contact dsi@zenika.com to ask for access (only zenika.com addresses can reach that address).

### Commands

- `firebase serve --only hosting,functions` to serve locally
- `npm run watch` in `ui` to have the front-end recompile automatically when the sources change (this does not include live reloading)
- `firebase deploy` to deploy (must be logged in first using `firebase login`)
