import { Vote } from "./cast-vote";
const voteMap: { [key: string]: { color: string; label: string } } = {
  great: { label: "Great 😁", color: "#1b5e20" },
  ok: { label: "OK 🙂", color: "#263238" },
  notThatGreat: { label: "So-so 😐", color: "#d67d00" },
  notGreatAtAll: { label: "Bad 😤", color: "#b71c1c" }
};

const composeEmailHtml = (vote: Vote) => {
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

export default composeEmailHtml;
