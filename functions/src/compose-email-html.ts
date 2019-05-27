import { Vote } from "./cast-vote";
const voteMap: { [key: string]: string } = {
  great: "Great",
  notThatGreat: "Not that great",
  notGreatAtAll: "Not great at all"
};

const composeEmailHtml = (vote: Vote) => {
  return `
      <p>Hi ${vote.managerEmail},</p>
      <p>
        ${vote.fullName} has shared how they feel:
        "${voteMap[vote.value]}".
      </p>
      ${
        vote.comment
          ? `
      <p>
        And left this comment:
        "${vote.comment}".
      </p>`
          : ``
      }
      <p>See you soon!</p>`;
};

export default composeEmailHtml;
