/**
 * Firebase Functions config only supports strings!
 */

type Flag = "true" | "false";
type DayOfMonth =
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "11"
  | "12"
  | "13"
  | "14"
  | "15"
  | "16"
  | "17"
  | "18"
  | "19"
  | "20"
  | "21"
  | "22"
  | "23"
  | "24"
  | "25"
  | "26"
  | "27"
  | "28";
type DaysBefore = DayOfMonth;

export const asNumber = (dayOfMonth: DayOfMonth | DaysBefore): number => {
  return Number(dayOfMonth);
};

export const asBoolean = (flag: Flag): boolean => {
  return flag === "true";
};

export const isEnabled = <Feature extends { enabled: Flag }>(
  feature: Feature
): boolean => {
  return asBoolean(feature.enabled);
};

export interface Auth0Config {
  client_id: string;
  domain: string;
}

export interface MailgunConfig {
  domain: string;
  api_key: string;
  recipient_override?: string;
}

export interface EndOfMonthRemindersConfig {
  start: Flag;
  end: Flag;
}

export interface VotingCampaignStartsReminderConfig {
  enabled: Flag;
  /**
   * Sender of the reminder emails.
   *
   * May be in the format "Display Name <address@domain>".
   */
  sender: string;
  /**
   * Mailing list to which to send the reminder emails.
   */
  recipient: string;
}

export interface VotingCampaignEndsReminderConfig {
  enabled: Flag;
  /**
   * Sender of the reminder emails.
   *
   * May be in the format "Display Name <address@domain>".
   */
  sender: string;
  /**
   * Mailing list to which to send the reminder emails.
   */
  recipient: string;
  /**
   * When to send the reminder, in number of days before the end of the
   * campaign.
   */
  days_before: DaysBefore;
}

export interface RemindersConfig {
  voting_campaign_starts: VotingCampaignStartsReminderConfig;
  voting_campaign_ends: VotingCampaignEndsReminderConfig;
}

/**
 * Voting campaigns restrict the dates on which it is possible to vote.
 */
export interface VotingCampaignsConfig {
  enabled: Flag;
  /**
   * Restrict to one vote per person.
   */
  require_unique_vote: Flag;
  /**
   * Day of the month on which monthly campaigns start.
   */
  start_on: DayOfMonth;
  /**
   * Day of the month on which monthly campaigns end.
   */
  end_on: DayOfMonth;
}

export interface DailyAlibeezImportConfig {
  enabled: Flag;
}

export interface FeaturesConfig {
  voting_campaigns: VotingCampaignsConfig;
  reminders: RemindersConfig;
  daily_alibeez_import: DailyAlibeezImportConfig;
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
