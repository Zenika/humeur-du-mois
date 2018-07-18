type Flag = "true" | "false";

export interface Auth0Config {
  client_id: string;
  domain: string;
}

export interface MailgunConfig {
  domain: string;
  api_key: string;
  recipient_override: string;
}

export interface EndOfMonthRemindersConfig {
  start: Flag;
  end: Flag;
}

export interface RemindersConfig {
  end_of_month: EndOfMonthRemindersConfig;
}

export interface FeaturesConfig {
  reminders: RemindersConfig;
}

export interface AlibeezConfig {
  url: string;
  key: string;
}

export interface ServiceAccountConfig {
  project_id: string;
  client_email: string;
  private_key: string;
}

export interface Config {
  auth0: Auth0Config;
  mailgun: MailgunConfig;
  features: FeaturesConfig;
  alibeez: AlibeezConfig;
  service_account: ServiceAccountConfig;
}
