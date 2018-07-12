declare const __ENV__: any;

const ENV: {
  AUTH0_CONFIG: {
    domain: string;
    clientID: string;
    scope: string;
    responseType: string;
    audience: string;
  };
} = __ENV__;

export const { AUTH0_CONFIG } = ENV;
