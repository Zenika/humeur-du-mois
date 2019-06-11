import test from "ava";
import composeEmailHtml from "./compose-email-html";
import { firestore } from "firebase-admin";

test("compose email html WITH a comment", t => {
  const vote = {
    managerEmail: "hugo.wood@zenika.com",
    fullName: "clement van peuter",
    value: "great",
    comment: "Zenika c'est trop bien",
    campaign: "plop",
    email: " clement.vanpeuter@zenika.com",
    agency: "nantes",
    recordedAt: firestore.Timestamp.now()
  };
  const expected = `
  <p>Hi hugo.wood@zenika.com,</p>
  <p>
    clement van peuter has shared how they feel:
    <p style="font-size:50px; color:red;">"Great 😁".</p>
  </p>
  <p>
    and left a comment:
    "Zenika c'est trop bien"
  </p>
  <p>See you soon!</p>`;

  const actual = composeEmailHtml(vote);
  t.is(actual, expected);
});

test("compose email html WITHOUT a comment", t => {
  const vote = {
    managerEmail: "hugo.wood@zenika.com",
    fullName: "clement van peuter",
    value: "great",
    campaign: "plop",
    email: " clement.vanpeuter@zenika.com",
    agency: "nantes",
    recordedAt: firestore.Timestamp.now()
  };
  const expected = `
  <p>Hi hugo.wood@zenika.com,</p>
  <p>
    clement van peuter has shared how they feel:
    <p style="font-size:50px; color:red;">"Great 😁".</p>
  </p>
  <p>See you soon!</p>`;

  const actual = composeEmailHtml(vote);
  t.is(actual, expected);
});
