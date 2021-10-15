import test from "ava";
import { composeEmailToManagerHtml } from "./compose-email-to-manager";
import { firestore } from "firebase-admin";
import { Vote } from "./cast-vote";

test("compose email html WITH a comment", t => {
  const vote: Vote = {
    managerEmail: "h.w@zenika.com",
    fullName: "cvp",
    value: "great",
    comment: "Zenika c'est trop bien",
    campaign: "plop",
    email: " cvp@zenika.com",
    agency: "nantes",
    recordedAt: firestore.Timestamp.now()
  };
  const expected = `
  <p>Hi h.w@zenika.com,</p>
  <p>
    cvp has shared how they feel:
    <p style="font-size:50px; color:#1b5e20;">Great 😁</p>
  </p>
  <p>
    and left a comment:
    "Zenika c'est trop bien"
  </p>
  <p>See you soon!</p>`;

  const actual = composeEmailToManagerHtml(vote);
  t.is(actual, expected);
});

test("compose email html WITHOUT a comment", t => {
  const vote: Vote = {
    managerEmail: "h.w@zenika.com",
    fullName: "cvp",
    value: "great",
    campaign: "plop",
    email: " cvp@zenika.com",
    agency: "nantes",
    recordedAt: firestore.Timestamp.now()
  };
  const expected = `
  <p>Hi h.w@zenika.com,</p>
  <p>
    cvp has shared how they feel:
    <p style="font-size:50px; color:#1b5e20;">Great 😁</p>
  </p>
  <p>See you soon!</p>`;

  const actual = composeEmailToManagerHtml(vote);
  t.is(actual, expected);
});
