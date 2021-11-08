import { FirebaseOptions } from "firebase/app";

declare const __ENV__: any;

const ENV: {
  AUTH0_CONFIG: {
    domain: string;
    client_id: string;
    scope: string;
    audience: string;
  };
  FIREBASE_CONFIG: FirebaseOptions;
} = __ENV__;

export const { AUTH0_CONFIG, FIREBASE_CONFIG } = ENV;
