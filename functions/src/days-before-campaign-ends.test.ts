import test from "ava";
import { daysBeforeCampaignEnds } from "./days-before-campaign-ends";

test("6 days remain", t => {
  const now = new Date(Date.UTC(2049, 6, 15));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.is(actual, 6);
});

test("21 days remain, end of campaign is next month", t => {
  const now = new Date(Date.UTC(2018, 8, 20));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 20,
    endOn: 10
  });
  t.is(actual, 21);
});

test("3 days remain", t => {
  const now = new Date(Date.UTC(2049, 6, 18));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.is(actual, 3);
});

test("1 day remain", t => {
  const now = new Date(Date.UTC(2049, 6, 20));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.is(actual, 1);
});

test("36h remain", t => {
  const now = new Date(Date.UTC(2049, 6, 19, 12));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.is(actual, 2);
});

test("1 second remain", t => {
  const now = new Date(Date.UTC(2049, 6, 20, 23, 59, 59));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.is(actual, 1);
});

test("campaign is already over", t => {
  const now = new Date(Date.UTC(2049, 6, 21));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.pass(); // behavior is unspecified
});

test("campaign has not started", t => {
  const now = new Date(Date.UTC(2049, 6, 5));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: true,
    startOn: 10,
    endOn: 20
  });
  t.pass(); // behavior is unspecified
});

test("no campaign, 7 days before end of month", t => {
  const now = new Date(Date.UTC(2049, 6, 25));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: false
  });
  t.is(actual, 7);
});

test("no campaign, on the last second of the month", t => {
  const now = new Date(Date.UTC(2049, 7, 1, 0, 0, -1));
  const actual = daysBeforeCampaignEnds(now, {
    enabled: false
  });
  t.is(actual, 1);
});
