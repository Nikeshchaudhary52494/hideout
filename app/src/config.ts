// Your computer's LAN IP (phone and computer on same Wi-Fi), or your deployed server (wss://...).
export const SERVER = 'ws://10.81.15.156:3000';
export const KEY = 'change-me'; // must match CHAT_KEY on the server
export const NAME_RULE = /^[\w .-]{2,20}$/; // usernames; the server checks the same rule
