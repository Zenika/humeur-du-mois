import { Vote } from "./cast-vote";
const voteMap: { [key: string]: string } = {
  great: "Great",
  notThatGreat: "Not that great",
  notGreatAtAll: "Not great at all"
};

const composeEmailHtml = (vote: Vote) => {
  if (vote.comment) {
    return `
    <p>Hi ${vote.managerEmail},</p>
    <p>
      ${vote.fullName} has shared how they feel:
      "${voteMap[vote.value]}".
    </p>
    <p>and left a comment:
    ${vote.comment}
    </p>
    <p>See you soon!</p>`;
  }
  return `
    <p>Hi ${vote.managerEmail},</p>
    <p>
      ${vote.fullName} has shared how they feel:
      "${voteMap[vote.value]}".
    </p>
    <p>See you soon!</p>`;
};

export default composeEmailHtml;
