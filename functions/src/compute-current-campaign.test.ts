import test from "ava";
import {
  computeCurrentCampaign,
  CampaignOptions
} from "./compute-current-campaign";

test("given campaigns are disabled, return the current month", t => {
  const voteDate = new Date(2049, 6, 15);
  const actual = computeCurrentCampaign(voteDate, { enabled: false });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign fits within the same month, and current day fits within the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 15));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign fits within the same month, and current day is exactly the beginning of the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 10));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign fits within the same month, and current date is exactly the end of the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 20, 23, 59, 59, 999));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign fits within the same month, and current date is exactly one millisecond before the beginning of the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 9, 23, 59, 59, 999));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign fits within the same month, and current date is exactly one millisecond after the end of the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 21));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign fits within the same month, and current day is before the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 5));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign fits within the same month, and current day is after the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 25));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current day is at the end of the month within the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 25));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current day is at the beginning of next month within the campaign, return next month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 5));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 5, id: "2049-06" });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current day is not within the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 15));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current day is exactly the beginning of the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 20));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current day is exactly the end of the campaign, return next month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 10, 23, 59, 59, 999));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 5, id: "2049-06" });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current date is exactly one millisecond before the beginning of the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 19, 23, 59, 59, 999));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign crosses the end of the month, and current date is exactly one millisecond after the end of the campaign, return null", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 11));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.deepEqual(actual, { open: false });
});

test("given campaigns are enabled, campaign spans the entire month, and current day is exactly both the beginning and the end of the campaign, return the current month", t => {
  const voteDate = new Date(Date.UTC(2049, 6, 15));
  const actual = computeCurrentCampaign(voteDate, {
    enabled: true,
    startOn: 15,
    endOn: 15
  });
  t.deepEqual(actual, { open: true, year: 2049, month: 6, id: "2049-07" });
});

test("dates are always compared using UTC, irrespective of the local time zone", t => {
  const campaignOptions: CampaignOptions = {
    enabled: true,
    startOn: 10,
    endOn: 20
  };
  // there is no way to create non-local dates in JS
  // so we have to use local dates to emulate non-UTC dates
  // this only works if local dates are not UTC dates
  const timezoneOffset = new Date().getTimezoneOffset();
  if (timezoneOffset === 0) {
    // there is no point running this test in an environment with no
    // offset from UTC, we may as well abort
    t.pass();
    return;
  }
  const voteDate =
    timezoneOffset < 0
      ? // these are local dates
        // they appear to fall within the campaign but they actually do not
        // because of timezones
        new Date(2049, 6, campaignOptions.startOn)
      : new Date(2049, 6, campaignOptions.endOn);
  const actual = computeCurrentCampaign(voteDate, campaignOptions);
  t.deepEqual(actual, { open: false });
});
