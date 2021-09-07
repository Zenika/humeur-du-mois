import { Vote } from "./cast-vote";
const voteMap: { [key: string]: { color: string; label: string } } = {
  great: { label: "Great 😁", color: "#1b5e20" },
  ok: { label: "OK 🙂", color: "#263238" },
  notThatGreat: { label: "So-so 😐", color: "#d67d00" },
  notGreatAtAll: { label: "Bad 😤", color: "#b71c1c" }
};

export const composeEmailHtml = (vote: Vote) => {
  let comment = "";
  if (vote.comment) {
    comment = `
  <p>
    and left a comment:
    "${vote.comment}"
  </p>`;
  }
  return `
  <p>Hi ${vote.managerEmail},</p>
  <p>
    ${vote.fullName} has shared how they feel:
    <p style="font-size:50px; color:${voteMap[vote.value].color};">${
    voteMap[vote.value].label
  }</p>
  </p>${comment}
  <p>See you soon!</p>`;
};

export function composeEmailAmpHtml(vote: Vote, token: string) {
  const content = composeEmailHtml(vote);
  return `
  <!DOCTYPE html>
<html ⚡4email data-css-strict>
  <head>
    <meta charset="utf-8" />
    <script async src="https://cdn.ampproject.org/v0.js"></script>
    <style amp4email-boilerplate>
      body {
        visibility: hidden;
      }
    </style>
    <style amp-custom>
      h1 {
        margin: 1rem;
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>
  `;
}
