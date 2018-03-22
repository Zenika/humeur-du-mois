declare const __ENV__: any;

const ENV: {
  API_BASE_URL: string;
  AUTH0_CONFIG: {
    domain: string;
    clientID: string;
    scope: string;
    responseType: string;
    audience: string;
  };
} = __ENV__;

export const { API_BASE_URL, AUTH0_CONFIG } = ENV;
