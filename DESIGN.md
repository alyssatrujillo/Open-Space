# Open Space

Open Space is a team-leader tool. It reads a charter and one meeting transcript, then writes a brief for the next meeting. Each person gets a card about what they contributed, and one move. The moves are meant to even out speaking turns and to keep each role's work with the person who owns it.

I built it for the moment after a meeting, when the person running the team can still change how the next hour goes. The page can open on a fictional team, Harbor, preparing a case recommendation, so the brief has a shape before a real recording exists. Names and the transcript in that example are made up. A real team replaces the roster and the transcript.

The brief stays in the browser. A transcript is a private team conversation, and people speak more freely when the record is for the next meeting rather than a file that leaves the room.

## Goal

Help a team use the evidence it already has.

Uneven participation is the concrete problem. In a meeting, the person with the most floor can declare a decision, park a disagreement, and pick up other people's work, all in the same ten minutes. The person with the research, or the slides, or the draft, then has little room to change the outcome. The team looks efficient and loses information.

The individual guidance is behavioral. A person above an even share gets an invitation to make: name someone, ask an open question, and stop. A person below an even share gets one prepared contribution tied to their role, so they do not have to improvise over a faster talker. Telling a quiet member to "speak up" in front of the group raises the cost of the next sentence. Structuring the turn, and asking a real question, lowers it.

## Inputs

**Team charter.** This is the team's own agreement: who owns which work, how a decision gets made, how speaking time is shared, and what happens in a disagreement. Open Space treats the charter as the standard and the meeting as the evidence. A blank decision rule is a finding, because a blank rule gets filled by whoever is talking. Mathieu and Rapp (2009) found that charters improve performance when teams also specify how they will do the work. The decision rule and the speaking-time norm are those specifications. Hackman (2002) makes the same structural point: a real team needs a compelling direction and an enabling structure, and the leader's ongoing job is coaching when the structure slips.

**A recorded meeting.** This is the input the team creates. One meeting is enough. Zoom's transcript, or any notes in `Name: what they said` lines, can be pasted, imported, or recorded in the browser. Speaker names have to match the roster. Each person's contribution is read from that transcript: how many turns they took, whether they gave a reason, whether they built on the previous person, whether they raised a challenge, and whether they took work that belongs to someone else's role.

## What the brief returns

Five scores, each with a sentence of evidence from this meeting:

- **Even floor.** Share of speaking turns. An even share for five people is about 20%. Word share sits beside it so a long monologue is visible. Woolley, Chabris, Pentland, Hashmi, and Malone (2010) found that groups were more collectively intelligent when speaking turns were more evenly distributed. Average intelligence did not explain the difference. Social sensitivity did, which is why the individual move for a high-floor person is a question rather than a shorter speech.
- **Room to disagree.** What the transcript does after a challenge. If the next turns postpone the point or close it with the deadline, the score drops. Edmondson (1999) showed that teams learn when speaking up feels possible. Jehn (1995) separated task conflict, which can improve decisions, from relationship conflict, which does not. A challenge to the recommendation is task conflict. The failure is parking it. Personal attacks are scored separately and more harshly.
- **Building on one another.** Reasons tied to the case, the numbers, or an example, and sentences that extend the previous person's point. The score asks whether that shows up in the meeting itself.
- **A visible decision rule.** Whether the charter names consensus, majority, or "the facilitator decides after everyone has spoken," and whether the meeting uses that test out loud. Setting the rule in the form raises the score and changes the agenda. The meeting still has to say the rule. A decision stated by the person with the most turns, with no test, is the pattern the charter is supposed to prevent.
- **Work stays with the owner.** The roster's role words are matched against "I'll do it" sentences. If the facilitator takes the recommendation and the alternatives, the brief names both and tells them to hand the work back. If someone offers to do their own role and the next speaker takes it, that is the same finding.

Then each person gets a card: their share of the floor, what they contributed in this meeting, and one thing to do next time. The next-meeting plan fits a short meeting. It starts by filling or restating the decision rule, gives a parked point two uninterrupted minutes, runs one timed round with no cross-talk, has each owner speak only for their role, decides with the rule, and writes owners in the team channel before anyone leaves.

The round is there because of production blocking. Diehl and Stroebe (1987) showed that groups lose ideas while members wait out someone else's speech. A sixty-second round removes the wait. Starting with the person who had the least floor makes the even-participation goal concrete.

Charter checks sit at the bottom. Filled fields that the meeting honored are marked as holding. Blank fields, a parked challenge, a yes-or-no check-in where an open question was needed, and work that migrated to the facilitator are marked as the agenda for the charter itself. The tool is a mid-meeting correction, in the spirit of the charter practice of revisiting agreements while the work can still change. Gersick (1988) found that teams often reset at a midpoint. This brief is a way to make that reset specific.

## Design choices

**Compare the meeting to the charter, instead of scoring personality.** Trait labels ("dominant," "quiet," "free rider") describe a person. Turn share, a parked disagreement, and a role word in an "I'll take it" sentence describe a meeting. The cards can be read out loud. That matches a charter norm of specific feedback, and it keeps the brief usable in the same room it describes.

**Share the brief with the whole team.** A participation note that stays with the facilitator becomes politics. A note everyone sees becomes the agenda. The copy button is there so the brief can go into the team channel before the next meeting.

**Read contribution from the meeting, not from a separate score sheet.** The assignment asks what guidance you can give a person about evening participation. The evidence is the transcript: who held the floor, who added a reason, who was waved off, and who agreed without adding their role. The card then tells the facilitator whom to invite, and tells that person the contribution to prepare. An invitation with nothing prepared still stalls. A prepared point with no invitation still gets parked.

**Keep the analysis local and inspectable.** The scores are rules in `analysis.js`, not a hidden model call. A team can see that "even floor" is turn share, and that a decision score moves when they fill in a rule. That matters in a class where the point is to understand the process, and it matters because people will not agree to record a meeting if they cannot tell what the tool is counting.

**Fit the next meeting to one hour.** The agenda is a procedure the facilitator can run. Coaching advice that does not fit the meeting length does not change the meeting.

## Harbor, the worked example

Harbor is five students closing a case recommendation. Maya facilitates and also takes the recommendation and the alternatives. Jordan brings the case numbers and then closes Sam's objection with the deadline, and assigns Chris's draft in the third person. Sam has the contradicting quotes, offers to write the alternatives, and is waved off. Priya agrees twice and never says what the slides will show. Chris is asked "you good?" and reports that half the section is unfinished.

The cards are written from those contributions. Maya's card is an invitation script. Sam's card is a prepared question plus taking the alternatives back. Priya's card replaces bare agreement with one slide decision. Chris's card puts a piece of the draft in the channel before the meeting, because a yes-or-no question will not surface it.

Changing the decision rule in the form changes the decision score and the first item of the agenda. That is the charter doing work.

## Limits

The tool counts words it can see. Tone, interruption, eye contact, and side conversations are outside a transcript. Sarcasm is easy to miss. Role checks look for the words you typed on the roster, so vague roles ("help out") produce vague checks, and specific roles ("slides," "alternatives") produce specific ones.

This is a meeting aid. It is a poor instrument for a formal peer evaluation. The cards are written to be said in the meeting, while the work can still move.

## References

Diehl, M., & Stroebe, W. (1987). Productivity loss in brainstorming groups: Toward the solution of a riddle. *Journal of Personality and Social Psychology, 53*(3), 497–509.

Edmondson, A. (1999). Psychological safety and learning behavior in work teams. *Administrative Science Quarterly, 44*(2), 350–383.

Gersick, C. J. G. (1988). Time and transition in work teams: Toward a new model of group development. *Academy of Management Journal, 31*(1), 9–41.

Hackman, J. R. (2002). *Leading teams: Setting the stage for great performances.* Harvard Business School Press.

Jehn, K. A. (1995). A multimethod examination of the benefits and detriments of intragroup conflict. *Administrative Science Quarterly, 40*(2), 256–282.

Mathieu, J. E., & Rapp, T. L. (2009). Laying the foundation for successful team performance trajectories: The roles of team charters and performance strategies. *Journal of Applied Psychology, 94*(1), 90–103.

Woolley, A. W., Chabris, C. F., Pentland, A., Hashmi, N., & Malone, T. W. (2010). Evidence for a collective intelligence factor in the performance of human groups. *Science, 330*(6004), 686–688.
