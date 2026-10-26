"use strict";

/**
 * Floor Brief
 * A local check of one team meeting against a charter.
 * Each person's card comes from what they said. The script does not send the transcript anywhere.
 */

const SAMPLE_TRANSCRIPT = `Maya: Thanks for getting on. We need to leave with a recommendation. I read the case again this morning. The numbers in exhibit 3 say the company is losing the core customer, and option A is the only move that stops the discounting. I think we should present option A and spend the slides on why the other options are slower.

Jordan: I went back through the exhibits. Option A matches the margin table, and option C ignores the cost increase in year two. If we present both as equal, we are not using the case. I can walk through the whole table if we want. I have notes on all four exhibits.

Maya: That helps. I was already leaning to option A. Let me write the recommendation tonight so the deck has a clear ask. I'll also pull everyone's notes into one doc.

Sam: Before we lock it, option B fits the customer quotes better. The case says the buyers left because the product got harder to use, not only because of price. I don't think we should treat option A as obvious. If we drop that, we miss the actual problem.

Maya: Option A is easier to defend in five minutes, so let's stay there for now. We can mention the other path later. Jordan, does option A still work if we only show exhibit 3?

Jordan: It works. The cost line is enough. We have to pick. The brief is due tomorrow and we're already tight. Option A is the obvious recommendation. Chris can finish the recommendation after we pick.

Priya: Yeah I agree, option A makes sense. I'm fine either way.

Maya: Great, so we'll go with option A. I'll write the recommendation and fold the alternatives into the doc. Priya, can you sketch three slides?

Sam: Before we decide, the quotes in the case still point at ease of use. I don't want to lose that.

Jordan: We have to pick. We're already tight.

Maya: Right. I'll note Sam's point as a later backup. Chris, you good with option A?

Chris: I think so. I don't have the draft yet.

Maya: Okay. I'll take the recommendation. Everyone drop leftover notes in the chat if you have them.

Priya: Works for me.

Jordan: I can update the exhibit summary so it says option A.

Sam: I can still write the alternatives if you want. I thought that was my section.

Maya: It's faster if I do it since I already started a doc. You can just send me what you have.

Chris: Sorry, I only finished half of my section. I'll do the rest tomorrow.

Maya: All good. Let's not miss the deadline. Anything else? Thanks everyone.`;

const DEFAULT_ROSTER = [
  "Maya Chen | Facilitator",
  "Jordan Hale | Case analysis",
  "Sam Ortiz | Alternatives",
  "Priya Shah | Slides",
  "Chris Nguyen | Recommendation draft",
].join("\n");

const SAMPLE_BREAKOUT = {
  Maya: { participation: 5, building: 3, evidence: 4 },
  Jordan: { participation: 4, building: 2, evidence: 4 },
  Sam: { participation: 2, building: 4, evidence: 5 },
  Priya: { participation: 3, building: 3, evidence: 2 },
  Chris: { participation: 2, building: 3, evidence: 3 },
};

const SAMPLE_PULSE = {
  halfFormed: 4,
  dissent: 2,
  roleClarity: 3,
  roleWork: 2,
};

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function round(n) {
  return Math.round(n);
}

function wordsOf(text) {
  return (String(text).trim().match(/\S+/g) || []).length;
}

function sentencesOf(text) {
  return String(text)
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function shorten(text, n) {
  const s = String(text).replace(/\s+/g, " ").trim();
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trim() + "…";
}

function roleWords(roleText) {
  const stop = new Set(
    "a an the and or of for to with from into onto your their our team member lead leader person people section own owns".split(
      " "
    )
  );
  const words = [
    ...new Set(
      String(roleText)
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4 && !stop.has(w))
    ),
  ];
  const s = String(roleText).toLowerCase();
  if (/discover|customer|value/.test(s)) words.push("interview", "quotes", "synthesis", "discovery", "customer");
  if (/prototype/.test(s)) words.push("prototype", "mockup", "screen");
  if (/compet/.test(s)) words.push("competitor", "competitive");
  if (/market|go-to/.test(s)) words.push("market", "channel");
  if (/econom|financ/.test(s)) words.push("economics", "pricing", "cost");
  if (/present|slide/.test(s)) words.push("slides", "presentation", "deck");
  if (/project/.test(s)) words.push("facilitate", "integrate");
  return [...new Set(words)];
}

function hasWord(text, word) {
  return new RegExp(`\\b${word}\\b`, "i").test(text);
}

function parseRoster(text) {
  const members = [];
  for (const line of String(text || "").split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [namePart, rolePart] = trimmed.split("|").map((p) => (p || "").trim());
    if (!namePart) continue;
    const full = namePart.replace(/\s+/g, " ");
    const first = full.split(" ")[0];
    const roles = rolePart || "Team member";
    members.push({
      key: first,
      first,
      full,
      roles,
      roleWords: roleWords(roles),
      facilitator: /facilitat|project lead/i.test(roles),
    });
  }
  const counts = {};
  for (const m of members) counts[m.first.toLowerCase()] = (counts[m.first.toLowerCase()] || 0) + 1;
  for (const m of members) {
    if (counts[m.first.toLowerCase()] > 1) m.key = m.full;
  }
  return members;
}

function speakerAliases(members) {
  const aliases = [];
  for (const m of members) {
    aliases.push({ name: m.full, member: m });
    if (m.full.toLowerCase() !== m.first.toLowerCase()) aliases.push({ name: m.first, member: m });
    aliases.push({ name: m.key, member: m });
  }
  aliases.sort((a, b) => b.name.length - a.name.length);
  return aliases;
}

function normalizeTranscript(raw) {
  let text = String(raw || "").replace(/\r/g, "");
  if (/^WEBVTT/m.test(text) || /-->/.test(text)) {
    text = text
      .replace(/^WEBVTT[^\n]*$/gm, "")
      .replace(/^\d+$/gm, "")
      .replace(/^\d\d:\d\d[:.]\d\d[^\n]*-->[^\n]*$/gm, "")
      .replace(/<v\s+([^>]+)>/gi, "\n$1: ")
      .replace(/<\/?[a-z][^>]*>/gi, "");
  }
  return text;
}

function parseTranscript(raw, members) {
  const text = normalizeTranscript(raw);
  const aliases = speakerAliases(members);
  const turns = [];
  const unmatched = [];

  function matchAlias(label) {
    const cleaned = label.trim().toLowerCase();
    for (const alias of aliases) {
      if (cleaned === alias.name.toLowerCase()) return alias.member;
    }
    return null;
  }

  for (const original of text.split("\n")) {
    const line = original.trim();
    if (!line) continue;
    const colon = line.match(/^([^:]{2,80}):\s*(.+)$/);
    if (colon) {
      const matched = matchAlias(colon[1]);
      if (matched) turns.push({ speaker: matched.key, text: colon[2].trim() });
      else unmatched.push(colon[1].trim());
    } else if (turns.length) {
      turns[turns.length - 1].text += " " + line;
    }
  }
  return { turns, unmatched: [...new Set(unmatched)] };
}

function emptyPerson(member) {
  return {
    ...member,
    turns: 0,
    words: 0,
    longest: 0,
    openNamed: [],
    consentChecks: [],
    evidenceTurns: 0,
    reasonTurns: 0,
    buildOns: 0,
    bareAgrees: 0,
    spillTook: [],
    spillQuotes: [],
    dissentTurns: [],
    deadlineClose: false,
    thirdPerson: [],
    offeredOwnWork: false,
    offerRejected: false,
    behind: false,
    behindQuote: "",
    questionsReceivedOpen: 0,
    consentReceived: 0,
    dissentDeferred: false,
    deferredQuote: "",
    turnShare: 0,
    wordShare: 0,
    over: false,
    under: false,
  };
}

function analyze(state) {
  const members = parseRoster(state.rosterText);
  if (!members.length) {
    return { error: "Add at least one person, in the form Name | Role." };
  }
  const parsed = parseTranscript(state.transcript, members);
  if (!parsed.turns.length) {
    return {
      error: "No speaking turns found. Start each turn with the person's name and a colon.",
      unmatched: parsed.unmatched,
    };
  }

  const stats = members.map(emptyPerson);
  const statOf = (key) => stats.find((s) => s.key === key);

  const annotated = parsed.turns.map((turn) => {
    const text = turn.text;
    const lower = text.toLowerCase();
    const asks = /\?/.test(text);
    const open =
      asks && /\b(what|why|how|which|who|where|tell me|walk me|thoughts|do you think)\b/i.test(text);
    const named = members.filter(
      (m) => m.key !== turn.speaker && new RegExp(`\\b${m.first}\\b`, "i").test(text)
    );
    const reasons = /\b(because|for example|exhibit|the case|the numbers|the quotes|the reading|the data)\b/i.test(
      text
    );
    const build = /\b(building on|to your point|adding to|what you said|as you said|i want to build)\b/i.test(lower);
    const bareAgree =
      /^(yeah\b|yes\b|i agree|sounds good|works for me|i'm fine|i am fine|fine either way|all good\b)/i.test(
        text.trim()
      ) &&
      wordsOf(text) <= 24 &&
      !/\bbecause\b/i.test(text);
    const dissent =
      /\b(i disagree|don't think|do not think|before we (lock|decide|pick)|another option|on the other hand|not convinced|don't want to lose|do not want to lose)\b/i.test(
        lower
      );
    const deadline = /\b(already tight|have to pick|running out of time|out of time|due tomorrow)\b/i.test(lower);
    const defer = /\b(for now|later|park it|move on|come back to|not tonight|table it|table that)\b/i.test(lower);
    const take = /\b(i('|’)ll|i will|let me|faster if i)\b/i.test(text);
    const consent = asks && /\b(you good|sound good|fine with|ok with|okay with|you okay|you ok)\b/i.test(lower);
    const behind = /\b(only finished|haven'?t finished|didn'?t finish|don't have the|do not have the|not done yet|half of my)\b/i.test(
      lower
    );
    return { ...turn, words: wordsOf(text), asks, open, named, reasons, build, bareAgree, dissent, deadline, defer, take, consent, behind };
  });

  annotated.forEach((turn, index) => {
    const s = statOf(turn.speaker);
    if (!s) return;
    s.turns += 1;
    s.words += turn.words;
    s.longest = Math.max(s.longest, turn.words);
    if (turn.reasons) {
      s.reasonTurns += 1;
      s.evidenceTurns += 1;
    }
    if (turn.build) s.buildOns += 1;
    if (turn.bareAgree) s.bareAgrees += 1;
    if (turn.behind) {
      s.behind = true;
      s.behindQuote = shorten(turn.text, 150);
    }
    if (turn.dissent) s.dissentTurns.push({ index, text: turn.text });

    for (const sentence of sentencesOf(turn.text)) {
      if (!sentence.includes("?")) continue;
      const sentenceNamed = members.filter(
        (m) => m.key !== turn.speaker && new RegExp(`\\b${m.first}\\b`, "i").test(sentence)
      );
      const sentenceOpen = /\b(what|why|how|which|who|where|tell me|walk me|thoughts|do you think)\b/i.test(
        sentence
      );
      const sentenceConsent = /\b(you good|sound good|fine with|ok with|okay with|you okay|you ok)\b/i.test(
        sentence
      );
      for (const other of sentenceNamed) {
        const target = statOf(other.key);
        if (sentenceOpen) {
          s.openNamed.push(other.first);
          if (target) target.questionsReceivedOpen += 1;
        } else if (sentenceConsent) {
          s.consentChecks.push(other.first);
          if (target) target.consentReceived += 1;
        }
      }
    }

    if (turn.take) {
      for (const sentence of sentencesOf(turn.text)) {
        if (!/\b(i('|’)ll|i will|let me|faster if i)\b/i.test(sentence)) continue;
        for (const other of stats) {
          if (other.key === s.key) continue;
          for (const word of other.roleWords) {
            if (!hasWord(sentence, word)) continue;
            if (s.roleWords.includes(word)) continue;
            if (!s.spillTook.find((item) => item.word === word)) {
              s.spillTook.push({ word, owner: other.first, label: other.roles });
              s.spillQuotes.push(shorten(sentence, 160));
            }
          }
        }
      }
    }

    if (turn.deadline) {
      const recent = annotated.slice(Math.max(0, index - 2), index).some((t) => t.dissent && t.speaker !== turn.speaker);
      if (recent) s.deadlineClose = true;
    }

    if (!turn.asks) {
      for (const other of members) {
        if (other.key === s.key) continue;
        if (!new RegExp(`\\b${other.first}\\b`, "i").test(turn.text)) continue;
        const aboutRole = other.roleWords.some((word) => hasWord(turn.text, word));
        if (aboutRole && /\b(can|should|will)\b/i.test(turn.text)) s.thirdPerson.push(other.first);
      }
    }
  });

  annotated.forEach((turn, index) => {
    const s = statOf(turn.speaker);
    if (!s) return;
    const offersOwn =
      /\b(i can|i('|’)ll|i will)\b/i.test(turn.text) && s.roleWords.some((word) => hasWord(turn.text, word));
    if (!offersOwn) return;
    s.offeredOwnWork = true;
    const nxt = annotated[index + 1];
    if (!nxt || nxt.speaker === turn.speaker) return;
    if (/\b(faster if i|i('|’)ll do it|i will do it|i already started|just send me)\b/i.test(nxt.text)) {
      s.offerRejected = true;
    }
  });

  const totalTurns = annotated.length;
  const totalWords = annotated.reduce((sum, t) => sum + t.words, 0) || 1;
  const n = stats.length;
  const equal = 1 / n;

  for (const s of stats) {
    s.turnShare = s.turns / totalTurns;
    s.wordShare = s.words / totalWords;
    s.over = s.turnShare >= equal * 1.45 && s.turns >= 2;
    s.under = s.turns === 0 || s.turnShare <= equal * 0.65;
    s.thirdPerson = [...new Set(s.thirdPerson)];
  }

  for (const s of stats) {
    for (const d of s.dissentTurns) {
      const follow = annotated.slice(d.index + 1, d.index + 3);
      const parked = follow.some((t) => t.defer || t.deadline);
      const explored = follow.some((t) => t.open && t.speaker !== s.key);
      if (parked && !explored) {
        s.dissentDeferred = true;
        const picked =
          sentencesOf(d.text).find((sen) =>
            /before we|don't think|do not think|lose that|option|disagree/i.test(sen)
          ) || d.text;
        s.deferredQuote = shorten(picked, 170);
      }
    }
  }

  const decisionTurn =
    annotated.find((t) =>
      /\b(we(?:'ll| will) go with|let's go with|so the decision|the decision is|we(?:'re| are) going with)\b/i.test(
        t.text
      )
    ) || null;

  const top = stats.slice().sort((a, b) => b.turns - a.turns || b.words - a.words)[0];
  const openToUnder = annotated.filter(
    (t) => t.open && t.named.some((m) => statOf(m.key) && statOf(m.key).under)
  ).length;
  const deferredPeople = stats.filter((s) => s.dissentDeferred);
  const rule = state.decisionRule || "";
  const usesRuleLanguage = annotated.some((t) =>
    /\b(majority|consensus|vote|in favor|consent|after everyone has spoken|full round)\b/i.test(t.text)
  );

  const shares = stats.map((s) => s.turnShare);
  const mad = shares.reduce((sum, x) => sum + Math.abs(x - equal), 0) / n;
  const maxMad = (2 * (1 - equal)) / n || 1;
  let floorScore = round(100 * (1 - mad / maxMad));
  if (top.turnShare > equal * 1.6) {
    floorScore -= round((top.turnShare / equal - 1.6) * 40);
  }
  if (stats.some((s) => s.turns === 0)) floorScore -= 12;
  floorScore = clamp(floorScore, 8, 98);

  let dissentScore = 82;
  if (deferredPeople.length) dissentScore -= 18 * deferredPeople.length;
  if (openToUnder === 0 && stats.some((s) => s.under)) dissentScore -= 8;
  const hostile = annotated.some((t) => /\b(you always|you never|that's stupid|that is stupid|ridiculous)\b/i.test(t.text));
  if (hostile) dissentScore -= 28;
  dissentScore = clamp(dissentScore, 6, 96);

  const reasoners = stats.filter((s) => s.reasonTurns > 0).length;
  const builders = stats.filter((s) => s.buildOns > 0).length;
  let buildScore = round((reasoners / n) * 68 + (builders / n) * 32);
  buildScore = clamp(buildScore, 8, 96);

  let decisionScore = decisionTurn ? 32 : 22;
  if (rule) decisionScore += 28;
  if (usesRuleLanguage) decisionScore += 18;
  if (decisionTurn && decisionTurn.speaker === top.key && !usesRuleLanguage) decisionScore -= 8;
  decisionScore = clamp(decisionScore, 8, 96);

  const spillLabels = [];
  stats.forEach((s) =>
    s.spillTook.forEach((item) => {
      const label = `${s.first} took ${item.owner}'s ${item.word}`;
      if (!spillLabels.includes(label)) spillLabels.push(label);
    })
  );
  const rejected = stats.filter((s) => s.offerRejected);
  let roleScore = 82;
  roleScore -= Math.min(3, spillLabels.length) * 12;
  roleScore -= rejected.length * 10;
  if (stats.some((s) => s.thirdPerson.length)) roleScore -= 8;
  roleScore = clamp(roleScore, 8, 96);

  const dimensions = [
    {
      id: "floor",
      label: "Even floor",
      score: floorScore,
      evidence: floorEvidence(stats, equal, openToUnder),
      why: "Woolley, Chabris, Pentland, Hashmi, and Malone (2010) found that groups did better when speaking turns were shared more evenly. The score uses turns. Word share is shown beside it so a long monologue is still visible.",
    },
    {
      id: "dissent",
      label: "Room to disagree",
      score: dissentScore,
      evidence: dissentEvidence(stats, deferredPeople, hostile),
      why: "Edmondson (1999) showed that teams learn when speaking up feels possible. Jehn (1995) found that task disagreement can improve a decision, and personal attacks do not. This score follows what the meeting does with a challenge.",
    },
    {
      id: "build",
      label: "Building on one another",
      score: buildScore,
      evidence: buildEvidence(stats),
      why: "A meeting can be full of reasons and still fail to use the previous speaker's point. The score counts reasons and explicit build-ons in the transcript.",
    },
    {
      id: "decision",
      label: "A visible decision rule",
      score: decisionScore,
      evidence: decisionEvidence(rule, decisionTurn, top, usesRuleLanguage),
      why: "Mathieu and Rapp (2009) found that a charter helps when the team also specifies how it will work. A decision rule is that specification. A blank rule gets filled by whoever is talking.",
    },
    {
      id: "roles",
      label: "Work stays with the owner",
      score: roleScore,
      evidence: roleEvidence(spillLabels, rejected),
      why: "Hackman (2002) treats a clear structure as a condition for performance, and treats coaching as the leader's job when the team drifts off that structure. Role words come from the roster you type.",
    },
  ];

  const ctx = { stats, equal, n, rule, top, openToUnder };
  const cards = stats
    .slice()
    .sort((a, b) => b.turnShare - a.turnShare)
    .map((s) => cardFor(s, ctx));

  return {
    teamName: state.teamName || "Your team",
    members: stats,
    totalTurns,
    totalWords,
    equal,
    unmatched: parsed.unmatched,
    dimensions,
    cards,
    leaderNote: buildLeaderNote({
      top,
      totalTurns,
      deferredPeople,
      dissenters: stats.filter((s) => s.dissentTurns.length),
      rule,
      teamName: state.teamName,
    }),
    agenda: buildAgenda({ stats, rule, deferredPeople, channel: state.channel, participationNorm: state.participationNorm }),
    charterChecks: buildChecks({
      stats,
      rule,
      participationNorm: state.participationNorm,
      conflictPath: state.conflictPath,
      channel: state.channel,
      openToUnder,
      deferredPeople,
      spillLabels,
      rejected,
      annotated,
    }),
    decisionQuote: decisionTurn ? shorten(decisionTurn.text, 180) : "",
  };
}

function pct(share) {
  return round(share * 100);
}

function theRole(roles) {
  const text = String(roles || "your role").trim();
  if (/^(the|a|an)\b/i.test(text)) return text.toLowerCase();
  return `the ${text.charAt(0).toLowerCase()}${text.slice(1)}`;
}

function floorEvidence(stats, equal, openToUnder) {
  const ranked = stats.slice().sort((a, b) => b.turnShare - a.turnShare);
  const top = ranked[0];
  const low = ranked.filter((s) => s.under);
  let line = `${top.first} took ${pct(top.turnShare)}% of the turns. An even floor would be about ${pct(equal)}% each.`;
  if (low.length) {
    line += ` ${low.map((s) => s.first).join(" and ")} ${low.length > 1 ? "are" : "is"} below that.`;
  } else {
    line += " Everyone is close to an even share of turns.";
  }
  if (top.wordShare - top.turnShare > 0.08) {
    line += ` ${top.first}'s share of the words is ${pct(top.wordShare)}%, so the turns are long as well as frequent.`;
  }
  if (openToUnder === 0 && low.length) {
    line += " Nobody asked an open question of a person below an even share.";
  }
  return line;
}

function dissentEvidence(stats, deferredPeople, hostile) {
  if (hostile) {
    return "The transcript includes a personal attack. That kind of conflict makes the next disagreement less likely.";
  }
  const dissenters = stats.filter((s) => s.dissentTurns.length);
  if (!deferredPeople.length && dissenters.length) {
    return `${dissenters.map((p) => p.first).join(" and ")} raised a disagreement, and the room stayed with the point instead of parking it.`;
  }
  if (!deferredPeople.length) {
    return "The transcript does not show a challenge being parked.";
  }
  const who = deferredPeople.map((p) => `${p.first} (“${p.deferredQuote}”)`).join(" ");
  return `${who} The following turns postponed the point or closed it with the clock.`;
}

function buildEvidence(stats) {
  const reasons = stats.filter((s) => s.reasonTurns > 0).map((s) => s.first);
  const builds = stats.filter((s) => s.buildOns > 0).map((s) => s.first);
  const silent = stats.filter((s) => s.reasonTurns === 0).map((s) => s.first);
  let line = reasons.length
    ? `${reasons.join(", ")} gave a reason tied to the case, the numbers, or an example.`
    : "Nobody tied a point to a reason the transcript can see.";
  if (silent.length) line += ` ${silent.join(" and ")} spoke without one.`;
  line += builds.length
    ? ` ${builds.join(" and ")} explicitly built on someone else's point.`
    : " Nobody picked up the previous person's point and extended it.";
  return line;
}

function labelRule(rule) {
  if (rule === "consensus") return "consensus";
  if (rule === "majority") return "majority vote";
  if (rule === "facilitator") return "the facilitator decides after everyone has spoken";
  return rule;
}

function decisionEvidence(rule, decisionTurn, top, usesRuleLanguage) {
  if (!decisionTurn) {
    return rule
      ? `No decision line showed up. The charter names ${labelRule(rule)}, so the close of the next meeting can use that test out loud.`
      : "No decision line showed up, and the charter has no decision rule yet. The next meeting will invent one in the moment unless you pick it at the start.";
  }
  if (!rule && !usesRuleLanguage) {
    return `${decisionTurn.speaker} states the decision. The charter has no rule filled in, so the working rule is whoever is holding the floor. ${top.first} held it.`;
  }
  if (rule && !usesRuleLanguage) {
    return `The charter says ${labelRule(rule)}. The meeting states an outcome and never uses that test.`;
  }
  return `The meeting states a decision and names a rule the team can see (${rule ? labelRule(rule) : "a vote or a full round"}).`;
}

function roleEvidence(spillLabels, rejected) {
  if (!spillLabels.length && !rejected.length) {
    return "The offers in the transcript line up with the roles on the roster.";
  }
  let line = spillLabels.length ? `${spillLabels.join("; ")}.` : "";
  if (rejected.length) {
    line += ` ${rejected.map((s) => s.first).join(" and ")} offered to do their own role and the next turn took it back.`;
  }
  return line.trim();
}

function quietestOther(stats, member) {
  return stats
    .filter((s) => s.key !== member.key)
    .sort((a, b) => a.turnShare - b.turnShare)[0];
}

function cardFor(member, ctx) {
  const evenPct = pct(ctx.equal);
  const quiet = quietestOther(ctx.stats, member);
  const parked = ctx.stats.find((s) => s.dissentDeferred);
  const floorLine = `${pct(member.turnShare)}% of turns, ${pct(member.wordShare)}% of words. An even share is about ${evenPct}%. Longest turn: ${member.longest} words. Open questions to a named teammate: ${member.openNamed.length}. Yes-or-no check-ins: ${member.consentChecks.length}.`;

  let pattern = "";
  let move = "";
  const took = [...new Set(member.spillTook.map((item) => item.word))];
  const tookPhrase = took.map((word) => `the ${word}`).join(" and ");

  if (member.facilitator && member.over && took.length) {
    const quote = member.spillQuotes[0] ? ` The line is “${member.spillQuotes[0].replace(/[.?!]+$/, "")}.”` : "";
    pattern = `You are running the meeting, and you also took ${tookPhrase}.${quote} Those words belong to other roles on the roster.`;
    move = `Open the next meeting by naming the decision in one sentence and asking which rule the team is using: consensus, majority, or you decide after a full round. Give ${parked ? parked.first : quiet.first} two uninterrupted minutes. Then run one round, one voice at a time, starting with ${quiet.first}. When you want to make a second point, ask ${quiet.first} an open question about ${quiet.roles.toLowerCase()} and stop after the question. Leave ${tookPhrase} with the people who own them.`;
  } else if (member.deadlineClose) {
    const handed = member.thirdPerson[0];
    pattern = handed
      ? `You brought reasons from your role, and you closed someone else's disagreement by pointing at the clock. You also assigned ${handed}'s work in the third person.`
      : `You brought reasons from your role, and you closed someone else's disagreement by pointing at the clock.`;
    move = handed
      ? `Keep your point to four sentences. Ask the person who disagreed what their evidence does to your conclusion, and wait. Ask ${handed} directly about their role. Let the facilitator call the decision after those answers.`
      : `Keep your point to four sentences. Ask the person who disagreed what their evidence does to your conclusion, and wait. Save the deadline for after that answer, and let the facilitator call the decision.`;
  } else if (member.dissentDeferred && member.offerRejected) {
    pattern = `Your challenge was parked, and your offer to do your own role was waved off. “${member.deferredQuote}”`;
    move = `Start your first turn with that point, phrased as a question, and then stop. Follow it with one sentence that takes the work back: you will do ${theRole(member.roles)} by a time you name, because that role is yours on the roster.`;
  } else if (member.dissentDeferred) {
    pattern = `You raised a task disagreement and the next turns parked it. “${member.deferredQuote}”`;
    move = `Ask the facilitator for two minutes before the decision is restated. Open with the point as a question to the room, then stop talking so someone else has to answer it.`;
  } else if (member.under && member.behind) {
    pattern = `Your share of the floor was low, and you named unfinished work. “${member.behindQuote}” ${
      member.consentReceived > 0 ? "The check-in you received was a yes-or-no question." : ""
    }`.trim();
    move = `Put one concrete piece of ${theRole(member.roles)} in the team channel before the meeting. In the room, attach a day and a time to the unfinished part. A prepared piece gives the team something to use from your role.`;
  } else if (member.bareAgrees >= 1 && member.reasonTurns === 0) {
    pattern = `Your turns agree. Add a specific from ${theRole(member.roles)}: what it will show if the current option stands.`;
    move = `Before you agree, add one thing your role will show if the current option stands, and one thing it will hide if the parked point is dropped. Say that before the word agree.`;
  } else if (member.over && member.buildOns === 0) {
    pattern = "You are over an even share of turns, and none of those turns pick up the previous person's point.";
    move = `Start one turn from ${quiet.first}'s last point, then add your role. Ask ${quiet.first} what their part changes about your conclusion. Stop after the question.`;
  } else if (member.over) {
    pattern = `You are carrying more of the floor than an even share. That helps when you are inviting people in. It crowds the other roles when the turns stay with you.`;
    move = `Make one point, then ask ${quiet.first} an open question about ${quiet.roles.toLowerCase()}. Count two other voices before you restate your point.`;
  } else if (member.under || member.turns === 0) {
    pattern =
      member.turns === 0
        ? "You are on the roster and this transcript has no turn under your name."
        : `Your share of turns is below even. Your role on the roster is ${member.roles.toLowerCase()}.`;
    move = `Bring one prepared contribution from that role. If the decision starts before you speak, use this sentence: “Before we close, my part is …” A prepared line is easier to say over a faster talker.`;
  } else {
    const teamEven = ctx.stats.every((s) => !s.over && !s.under);
    if (teamEven) {
      pattern = `You held an even share. ${
        member.reasonTurns ? "Your turns carried a reason." : "Your turns stayed with your role."
      }${member.buildOns ? " You picked up someone else's point before adding your own." : ""}`;
      move = "Do this again. One reason from your role, one question to someone else, then stop.";
    } else {
      pattern = `Your share of the floor is close to even. ${
        member.reasonTurns ? "You tied comments to a reason." : "A specific from your role would make the next turn easier to use."
      }`;
      move = `Keep that share. Ask ${quiet.first} one open question about ${quiet.roles.toLowerCase()}, and answer your own role with one specific.`;
    }
  }

  return {
    name: member.first,
    full: member.full,
    roles: member.roles,
    turnPct: pct(member.turnShare),
    wordPct: pct(member.wordShare),
    over: member.over,
    under: member.under,
    floorLine,
    pattern: pattern.replace(/\s+/g, " ").trim(),
    move: move.replace(/\s+/g, " ").trim(),
  };
}

function buildLeaderNote(ctx) {
  const pieces = [];
  pieces.push(`${ctx.top.first} took ${pct(ctx.top.turnShare)}% of the turns across ${ctx.totalTurns} turns.`);
  if (ctx.deferredPeople.length) {
    pieces.push(
      `${ctx.deferredPeople.map((p) => p.first).join(" and ")} raised a disagreement, and the next turns parked it or closed it with the clock.`
    );
  } else if (ctx.dissenters && ctx.dissenters.length) {
    pieces.push(
      `${ctx.dissenters.map((p) => p.first).join(" and ")} raised a disagreement, and the room stayed with it.`
    );
  } else {
    pieces.push("The transcript does not show a challenge being parked.");
  }
  if (!ctx.rule) {
    pieces.push("No decision rule is filled in, so the working rule was whoever held the floor.");
  } else {
    pieces.push(`The charter names ${labelRule(ctx.rule)}. Say that test out loud before anyone restates the decision.`);
  }
  pieces.push(
    "Each person gets one move for the next meeting. Share the brief with the whole team so the meeting starts from the same page."
  );
  return pieces.join(" ");
}

function buildAgenda(ctx) {
  const lead = ctx.stats.find((s) => s.facilitator) || ctx.stats.slice().sort((a, b) => b.turns - a.turns)[0];
  const quiet = ctx.stats.slice().sort((a, b) => a.turnShare - b.turnShare)[0];
  const channel = (ctx.channel || "").trim() || "the team channel";
  const items = [];
  items.push({
    min: "5 min",
    title: ctx.rule ? `Restate the rule: ${labelRule(ctx.rule)}` : "Choose the decision rule before the content",
    detail: ctx.rule
      ? `${lead.first} reads the rule and says how the close of this meeting will use it. The content argument waits.`
      : `${lead.first} asks the team to pick one rule and write it on the charter: consensus, majority, or the facilitator decides after everyone has spoken once. That choice happens before the recommendation is argued again.`,
  });
  if (ctx.deferredPeople.length) {
    items.push({
      min: "8 min",
      title: `${ctx.deferredPeople.map((p) => p.first).join(" and ")} put the parked point back on the table`,
      detail: "Two uninterrupted minutes. The room's job is a question about what the decision would do differently if that point is true.",
    });
  }
  const norm = (ctx.participationNorm || "").trim();
  items.push({
    min: "15 min",
    title: norm ? "Run the participation norm you wrote down" : "One round, sixty seconds each, no cross-talk",
    detail: norm
      ? `The charter says: ${norm} Start with ${quiet.first}.`
      : `Start with ${quiet.first}. Each person adds one unused idea or one risk. Diehl and Stroebe (1987) showed that people lose ideas while they wait out someone else's speech. A round removes that wait. Write a participation norm on the charter afterward so the round is a team rule.`,
  });
  items.push({
    min: "12 min",
    title: "Each owner speaks only for their role",
    detail: `${lead.first} leaves the notes with the owners during this block. Each person says what their role changes about the decision. Offers of work stay with the person who owns that role.`,
  });
  items.push({
    min: "5 min",
    title: "Decide out loud with the rule",
    detail: ctx.rule
      ? `${lead.first} applies ${labelRule(ctx.rule)} and states the outcome in one sentence.`
      : `${lead.first} applies the rule you just chose and states the outcome in one sentence.`,
  });
  items.push({
    min: "5 min",
    title: `Write owners in ${channel} before you leave`,
    detail: "Name the owner from the roster and the time for any unfinished piece. Each person names the one move on their card they will use next time. The facilitator goes last.",
  });
  return items;
}

function buildChecks(ctx) {
  const checks = [];
  const rolesOk = ctx.stats.every((s) => s.roleWords.length > 0);
  checks.push({
    ok: rolesOk,
    title: "Every person has a role on the roster",
    detail: rolesOk
      ? "The brief can only hand work back when a role has a name. Specific words, like “slides” or “alternatives,” give the check something to find in the transcript."
      : "Add a role after the vertical bar on each roster line.",
  });
  checks.push({
    ok: Boolean(ctx.rule),
    title: "The charter names a decision rule",
    detail: ctx.rule
      ? `Using ${labelRule(ctx.rule)}. The meeting still has to say it out loud.`
      : "Consensus, majority, and “the facilitator decides after a full round” are the usual choices. A blank rule gets filled by airtime.",
  });
  checks.push({
    ok: Boolean((ctx.participationNorm || "").trim()),
    title: "The charter names how speaking time will be shared",
    detail: (ctx.participationNorm || "").trim()
      ? `Norm on the charter: ${ctx.participationNorm.trim()}`
      : "An even floor needs a procedure. A round-robin before the decision is the simplest one. Woolley and colleagues (2010) tied shared turns to better group decisions.",
  });
  checks.push({
    ok: Boolean((ctx.conflictPath || "").trim()),
    title: "The charter says what happens when you disagree",
    detail: (ctx.conflictPath || "").trim()
      ? `Path on the charter: ${ctx.conflictPath.trim()}`
      : "Write the path. “We will talk it through” still needs a moment in the agenda when the disagreement is answered.",
  });
  checks.push({
    ok: Boolean((ctx.channel || "").trim()),
    title: "One channel is named for decisions and unfinished work",
    detail: (ctx.channel || "").trim()
      ? `Channel: ${ctx.channel.trim()}. Put the decision there before the meeting ends.`
      : "Name one channel. A decision that lives only in the meeting is hard to hold people to.",
  });
  checks.push({
    ok: ctx.deferredPeople.length === 0,
    title: "A challenge was answered, or there was no challenge",
    detail: ctx.deferredPeople.length
      ? `${ctx.deferredPeople.map((p) => p.first).join(" and ")} raised a task disagreement and the next turns parked it or used the deadline.`
      : "No parked challenge showed up in this transcript.",
  });
  checks.push({
    ok: ctx.openToUnder > 0 || !ctx.stats.some((s) => s.under),
    title: "Someone below an even share got an open question",
    detail:
      ctx.openToUnder > 0
        ? "At least one open question was aimed at a person below an even share."
        : "Yes-or-no check-ins do not change the floor. An open question names the person and asks what, why, or how.",
  });
  checks.push({
    ok: ctx.spillLabels.length === 0 && ctx.rejected.length === 0,
    title: "Work stayed with the person who owns it",
    detail:
      ctx.spillLabels.length || ctx.rejected.length
        ? `${ctx.spillLabels.join("; ")}${ctx.spillLabels.length ? ". " : ""}${
            ctx.rejected.length ? ctx.rejected.map((s) => s.first).join(" and ") + " offered to do their role and was waved off." : ""
          }`
        : "The transcript's offers match the roster.",
  });
  const behind = ctx.stats.filter((s) => s.behind);
  checks.push({
    ok: behind.length === 0,
    title: "Unfinished work got a time",
    detail: behind.length
      ? `${behind.map((s) => s.first).join(" and ")} named unfinished work. The next meeting gives it an owner and a time in the same conversation.`
      : "Nobody named a slipped piece of work in this transcript.",
  });
  return checks;
}

function band(score) {
  if (score >= 75) return "In good shape";
  if (score >= 50) return "Uneven";
  return "Needs a process change";
}

function defaultState() {
  return {
    teamName: "Harbor (example)",
    transcript: SAMPLE_TRANSCRIPT,
    rosterText: DEFAULT_ROSTER,
    decisionRule: "",
    participationNorm: "",
    conflictPath: "We will talk it through in the meeting.",
    channel: "",
    meetingLength: "50 minutes",
  };
}

const api = {
  analyze,
  parseRoster,
  defaultState,
  band,
  SAMPLE_TRANSCRIPT,
  DEFAULT_ROSTER,
  SAMPLE_BREAKOUT,
  SAMPLE_PULSE,
};

if (typeof window !== "undefined") window.FloorBrief = api;

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
  if (require.main === module) {
    const result = analyze(defaultState());
    if (result.error) {
      console.error(result.error);
      process.exit(1);
    }
    const maya = result.members.find((m) => m.first === "Maya");
    const sam = result.members.find((m) => m.first === "Sam");
    const jordan = result.members.find((m) => m.first === "Jordan");
    const chris = result.members.find((m) => m.first === "Chris");
    const priya = result.members.find((m) => m.first === "Priya");
    const checks = [
      ["maya spill", maya.spillTook.length > 0],
      ["sam deferred", sam.dissentDeferred],
      ["sam rejected", sam.offerRejected],
      ["jordan deadline", jordan.deadlineClose],
      ["jordan third", jordan.thirdPerson.includes("Chris")],
      ["chris behind", chris.behind],
      ["priya agree", priya.bareAgrees >= 1],
      ["maya over", maya.over],
    ];
    const failed = checks.filter((c) => !c[1]);
    console.log(
      JSON.stringify(
        {
          scores: result.dimensions.map((d) => [d.score, d.label]),
          members: result.members.map((m) => ({
            name: m.first,
            turns: m.turns,
            turnPct: Math.round(m.turnShare * 100),
            spill: m.spillTook,
            defer: m.dissentDeferred,
            deadline: m.deadlineClose,
            third: m.thirdPerson,
            behind: m.behind,
            agree: m.bareAgrees,
          })),
          failed,
          leader: result.leaderNote,
          cards: result.cards.map((c) => ({ name: c.name, pattern: c.pattern, move: c.move })),
        },
        null,
        2
      )
    );
    if (failed.length) process.exit(1);
  }
}
