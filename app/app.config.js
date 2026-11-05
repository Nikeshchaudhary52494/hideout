// Extends app.json with Firebase's google-services.json (needed for push notifications on Android).
// The file stays out of git: locally it's ./google-services.json, and on EAS it comes from the
// GOOGLE_SERVICES_JSON secret file variable (see eas.json "preview" environment).
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
